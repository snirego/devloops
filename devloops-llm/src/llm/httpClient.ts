/**
 * Railway-compatible HTTP client with comprehensive diagnostics.
 *
 * Problem: Node.js native fetch() (Undici) doesn't work reliably with
 * Railway's private networking (*.railway.internal). Additionally, DNS
 * resolution can fail if the service name doesn't match or private
 * networking isn't enabled.
 *
 * Solution: For .railway.internal URLs, use Node.js built-in http module
 * which handles IPv6 correctly. Includes full DNS diagnostics when errors
 * occur so problems are immediately obvious in logs.
 */

import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import { getLogger } from "../utils/logger.js";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HttpRequestOptions {
  method: string;
  headers: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface HttpResponse {
  ok: boolean;
  status: number;
  statusText: string;
  text: () => Promise<string>;
  json: () => Promise<unknown>;
}

export interface DnsTestResult {
  hostname: string;
  ipv4: string[] | null;
  ipv4Error: string | null;
  ipv6: string[] | null;
  ipv6Error: string | null;
  lookup: { address: string; family: number } | null;
  lookupError: string | null;
}

export interface ConnectivityTestResult {
  url: string;
  dns: DnsTestResult;
  httpResult: { ok: boolean; status: number; bodyPreview: string } | null;
  httpError: string | null;
  nativeFetchResult: { ok: boolean; status: number; bodyPreview: string } | null;
  nativeFetchError: string | null;
  recommendation: string;
}

// ─── DNS Diagnostics ──────────────────────────────────────────────────────────

/**
 * Run comprehensive DNS tests for a hostname.
 * Returns all resolution results (IPv4, IPv6, lookup) with errors.
 */
export async function testDns(hostname: string): Promise<DnsTestResult> {
  const result: DnsTestResult = {
    hostname,
    ipv4: null,
    ipv4Error: null,
    ipv6: null,
    ipv6Error: null,
    lookup: null,
    lookupError: null,
  };

  // Test IPv4
  await new Promise<void>((resolve) => {
    dns.resolve4(hostname, (err, addresses) => {
      if (err) result.ipv4Error = `${err.code}: ${err.message}`;
      else result.ipv4 = addresses;
      resolve();
    });
  });

  // Test IPv6
  await new Promise<void>((resolve) => {
    dns.resolve6(hostname, (err, addresses) => {
      if (err) result.ipv6Error = `${err.code}: ${err.message}`;
      else result.ipv6 = addresses;
      resolve();
    });
  });

  // Test dns.lookup (what http module uses)
  await new Promise<void>((resolve) => {
    dns.lookup(hostname, { all: false }, (err, address, family) => {
      if (err) result.lookupError = `${err.code}: ${err.message}`;
      else result.lookup = { address, family };
      resolve();
    });
  });

  return result;
}

// ─── Connectivity Test ────────────────────────────────────────────────────────

/**
 * Run a full connectivity test against a URL.
 * Tests DNS, http module request, and native fetch.
 * Returns a human-readable recommendation.
 */
export async function testConnectivity(
  baseUrl: string,
): Promise<ConnectivityTestResult> {
  const parsed = new URL(baseUrl);
  const hostname = parsed.hostname;
  const ollamaBase = baseUrl.replace(/\/v1\/?$/, "");
  const testUrl = `${ollamaBase}/api/tags`;

  const dnsResult = await testDns(hostname);

  const result: ConnectivityTestResult = {
    url: testUrl,
    dns: dnsResult,
    httpResult: null,
    httpError: null,
    nativeFetchResult: null,
    nativeFetchError: null,
    recommendation: "",
  };

  // If DNS completely failed, skip HTTP tests
  if (!dnsResult.ipv4 && !dnsResult.ipv6 && !dnsResult.lookup) {
    if (hostname.endsWith(".railway.internal")) {
      result.recommendation =
        `DNS FAILED: "${hostname}" does not resolve. ` +
        `Check Railway dashboard: (1) Is the Ollama service actually named "${hostname.split(".")[0]}"? ` +
        `The Railway private domain format is <service-name>.railway.internal. ` +
        `(2) Is private networking enabled on the Ollama service? ` +
        `(3) Are both services in the same Railway project and environment? ` +
        `You can find the correct private domain in the service's Settings > Networking > Private Networking section.`;
    } else {
      result.recommendation =
        `DNS FAILED: "${hostname}" does not resolve. Check that the LLM_BASE_URL is correct.`;
    }
    return result;
  }

  // Determine which family to use
  const family = dnsResult.ipv6 ? 6 : dnsResult.ipv4 ? 4 : 0;

  // Test with http module
  try {
    const res = await httpModuleRequest(testUrl, {
      method: "GET",
      headers: {},
      timeoutMs: 10_000,
    }, family || undefined);
    const body = await res.text();
    result.httpResult = {
      ok: res.ok,
      status: res.status,
      bodyPreview: body.slice(0, 300),
    };
  } catch (err) {
    result.httpError = err instanceof Error ? err.message : String(err);
  }

  // Test with native fetch
  try {
    const res = await fetch(testUrl, { signal: AbortSignal.timeout(10_000) });
    const body = await res.text().catch(() => "");
    result.nativeFetchResult = {
      ok: res.ok,
      status: res.status,
      bodyPreview: body.slice(0, 300),
    };
  } catch (err) {
    result.nativeFetchError = err instanceof Error ? err.message : String(err);
  }

  // Build recommendation
  if (result.httpResult?.ok) {
    result.recommendation = "LLM endpoint is reachable via http module. Everything should work.";
  } else if (result.nativeFetchResult?.ok) {
    result.recommendation = "LLM endpoint is reachable via native fetch but not http module. This is unusual.";
  } else if (result.httpError && result.nativeFetchError) {
    result.recommendation =
      `LLM endpoint is NOT reachable by either method. ` +
      `DNS resolved to ${JSON.stringify(dnsResult.lookup ?? dnsResult.ipv6 ?? dnsResult.ipv4)}, ` +
      `but the connection failed. Check that the Ollama service is running and listening on port ${parsed.port || 80}.`;
  } else {
    result.recommendation = "Partial connectivity — check individual test results.";
  }

  return result;
}

// ─── HTTP Module Request ──────────────────────────────────────────────────────

/**
 * Make an HTTP request using Node's built-in http/https module.
 * Supports explicit address family selection for Railway internal networking.
 */
function httpModuleRequest(
  url: string,
  options: HttpRequestOptions,
  family?: number,
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === "https:";
    const lib = isHttps ? https : http;

    const reqOptions: http.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: options.method,
      headers: options.headers,
      timeout: options.timeoutMs ?? 120_000,
    };

    // If a specific family is requested, set it
    // For Railway internal, we try IPv6 first since their mesh is IPv6
    if (family) {
      reqOptions.family = family;
    }

    const req = lib.request(reqOptions, (res) => {
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
    });

    req.on("error", (err) => {
      reject(new Error(`HTTP request to ${url} failed: ${err.message}`));
    });

    req.on("timeout", () => {
      req.destroy(
        new Error(`HTTP request to ${url} timed out after ${options.timeoutMs ?? 120_000}ms`),
      );
    });

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

// ─── Railway-Aware Fetch ──────────────────────────────────────────────────────

function isRailwayInternal(url: string): boolean {
  return url.includes(".railway.internal");
}

/**
 * Drop-in replacement for fetch() that works with Railway private networking.
 *
 * For *.railway.internal URLs:
 *   - Uses Node's http module (bypasses Undici IPv6 bugs)
 *   - Tries IPv6 first (Railway mesh), falls back to IPv4, then no family preference
 *   - On DNS failure, logs a detailed diagnostic message
 *
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
  const logger = getLogger();

  if (isRailwayInternal(url)) {
    const hostname = new URL(url).hostname;
    const options: HttpRequestOptions = {
      method: init.method ?? "GET",
      headers: init.headers ?? {},
      body: init.body,
      signal: init.signal,
      timeoutMs: init.timeoutMs,
    };

    // Try multiple address families in order
    const families: Array<number | undefined> = [6, 4, undefined];

    for (const family of families) {
      try {
        return await httpModuleRequest(url, options, family);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const isLastAttempt = family === families[families.length - 1];

        // If DNS fails, don't bother trying other families
        if (errMsg.includes("ENOTFOUND")) {
          // Run full DNS diagnostics for the error message
          const dnsResult = await testDns(hostname);
          const diagMsg =
            `DNS resolution failed for "${hostname}". ` +
            `IPv4: ${dnsResult.ipv4 ? dnsResult.ipv4.join(", ") : dnsResult.ipv4Error ?? "no result"}. ` +
            `IPv6: ${dnsResult.ipv6 ? dnsResult.ipv6.join(", ") : dnsResult.ipv6Error ?? "no result"}. ` +
            `Lookup: ${dnsResult.lookup ? `${dnsResult.lookup.address} (family ${dnsResult.lookup.family})` : dnsResult.lookupError ?? "no result"}. ` +
            (hostname.endsWith(".railway.internal")
              ? `ACTION REQUIRED: Go to Railway dashboard → Ollama service → Settings → Networking → Private Networking. ` +
                `Copy the exact "Private Domain" value and set it as LLM_BASE_URL (e.g., http://<private-domain>:11434/v1). ` +
                `The service name in the URL must EXACTLY match the private domain shown in Railway.`
              : `Check that LLM_BASE_URL is set to a valid, reachable URL.`);

          logger.error(
            { hostname, url, dnsResult },
            `[LLM] ${diagMsg}`,
          );
          throw new Error(diagMsg);
        }

        if (isLastAttempt) {
          logger.error(
            { url, family, err: errMsg },
            "[LLM] All connection attempts to Railway internal URL failed",
          );
          throw err;
        }

        logger.debug(
          { url, family, err: errMsg },
          `[LLM] Railway internal request failed with family=${family}, trying next`,
        );
      }
    }

    // Should never reach here, but TypeScript needs it
    throw new Error(`All connection attempts to ${url} failed`);
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
