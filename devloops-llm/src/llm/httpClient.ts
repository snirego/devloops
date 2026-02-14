/**
 * Railway-compatible HTTP client.
 *
 * Problem: Node.js native fetch() (Undici) doesn't work reliably with
 * Railway's private networking (*.railway.internal). The DNS resolves to
 * IPv6 addresses, but Undici has known issues connecting over IPv6 on
 * Railway's Wireguard mesh.
 *
 * Solution: For .railway.internal URLs, use Node.js built-in http module
 * which handles IPv6 correctly. For all other URLs, use native fetch().
 */

import http from "node:http";
import https from "node:https";
import { getLogger } from "../utils/logger.js";

interface HttpRequestOptions {
  method: string;
  headers: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}

interface HttpResponse {
  ok: boolean;
  status: number;
  statusText: string;
  text: () => Promise<string>;
  json: () => Promise<unknown>;
}

function isRailwayInternal(url: string): boolean {
  return url.includes(".railway.internal");
}

/**
 * Make an HTTP request using Node's built-in http/https module.
 * This works correctly with Railway's IPv6-only internal network.
 */
function httpModuleRequest(
  url: string,
  options: HttpRequestOptions,
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === "https:";
    const lib = isHttps ? https : http;

    const req = lib.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: options.method,
        headers: options.headers,
        // Force IPv6 lookup for Railway internal — this is the key fix
        family: 6,
        // Timeout at the socket level
        timeout: options.timeoutMs ?? 120_000,
      },
      (res) => {
        const chunks: Buffer[] = [];

        res.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
        });

        res.on("end", () => {
          const bodyText = Buffer.concat(chunks).toString("utf-8");
          const status = res.statusCode ?? 0;

          resolve({
            ok: status >= 200 && status < 300,
            status,
            statusText: res.statusMessage ?? "",
            text: async () => bodyText,
            json: async () => JSON.parse(bodyText),
          });
        });

        res.on("error", reject);
      },
    );

    req.on("error", reject);

    req.on("timeout", () => {
      req.destroy(new Error(`Request timed out after ${options.timeoutMs ?? 120_000}ms`));
    });

    // Handle AbortSignal
    if (options.signal) {
      if (options.signal.aborted) {
        req.destroy(new Error("Request aborted"));
        return;
      }
      options.signal.addEventListener("abort", () => {
        req.destroy(new Error("Request aborted"));
      });
    }

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

/**
 * Drop-in replacement for fetch() that works with Railway private networking.
 *
 * For *.railway.internal URLs: uses Node's http module with IPv6
 * For all other URLs: delegates to native fetch()
 */
export async function railwayFetch(
  url: string,
  init: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
    timeoutMs?: number;
  } = {},
): Promise<HttpResponse> {
  if (isRailwayInternal(url)) {
    const logger = getLogger();
    logger.debug({ url, method: init.method ?? "GET" }, "Using http module for Railway internal URL");

    return httpModuleRequest(url, {
      method: init.method ?? "GET",
      headers: init.headers ?? {},
      body: init.body,
      signal: init.signal,
      timeoutMs: init.timeoutMs,
    });
  }

  // For non-Railway URLs, use native fetch
  const res = await fetch(url, {
    method: init.method,
    headers: init.headers,
    body: init.body,
    signal: init.signal,
  });

  return {
    ok: res.ok,
    status: res.status,
    statusText: res.statusText,
    text: () => res.text(),
    json: () => res.json(),
  };
}
