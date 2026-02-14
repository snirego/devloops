/**
 * Production-hardened OpenAI-compatible LLM client.
 *
 * Features:
 *  - Configurable timeout via env
 *  - Retry with exponential backoff on 429 / 503
 *  - Circuit breaker: after N consecutive failures, fail-fast for 30 s
 *  - Structured JSON completion with validation + repair
 *  - Request logging with duration and token usage
 */

import { getConfig } from "../config.js";
import { getLogger } from "../utils/logger.js";
import { repairJson } from "./jsonRepair.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LlmResult<T> {
  ok: true;
  data: T;
  rawContent: string;
}

export interface LlmError {
  ok: false;
  error: string;
  rawContent?: string;
}

export type LlmResponse<T> = LlmResult<T> | LlmError;

// ─── Circuit Breaker ─────────────────────────────────────────────────────────

const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_MS = 30_000;

let consecutiveFailures = 0;
let circuitOpenUntil = 0;

function recordSuccess(): void {
  consecutiveFailures = 0;
}

function recordFailure(): void {
  consecutiveFailures++;
  if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitOpenUntil = Date.now() + CIRCUIT_BREAKER_RESET_MS;
    getLogger().warn(
      { consecutiveFailures, resetMs: CIRCUIT_BREAKER_RESET_MS },
      "Circuit breaker OPEN — LLM requests will fail fast",
    );
  }
}

function isCircuitOpen(): boolean {
  if (consecutiveFailures < CIRCUIT_BREAKER_THRESHOLD) return false;
  if (Date.now() > circuitOpenUntil) {
    // Half-open: allow one request through
    getLogger().info("Circuit breaker half-open — allowing probe request");
    consecutiveFailures = CIRCUIT_BREAKER_THRESHOLD - 1;
    return false;
  }
  return true;
}

// ─── Retry Helper ────────────────────────────────────────────────────────────

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const RETRYABLE_STATUS_CODES = new Set([429, 503, 502, 504]);
const MAX_FETCH_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1_000;

// ─── Core Chat Completion ────────────────────────────────────────────────────

export async function chatCompletion(
  messages: ChatMessage[],
  temperature = 0.1,
  maxTokens = 4096,
): Promise<string> {
  if (isCircuitOpen()) {
    throw new Error("Circuit breaker is OPEN — LLM endpoint appears down");
  }

  const config = getConfig();
  const logger = getLogger();
  const url = `${config.LLM_BASE_URL}/chat/completions`;
  const startTime = Date.now();

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_FETCH_RETRIES; attempt++) {
    if (attempt > 0) {
      const backoff = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
      const jitter = Math.random() * backoff * 0.3;
      logger.info(
        { attempt, backoffMs: Math.round(backoff + jitter) },
        "Retrying LLM request",
      );
      await sleep(backoff + jitter);
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      config.LLM_REQUEST_TIMEOUT_MS,
    );

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.LLM_API_KEY}`,
        },
        body: JSON.stringify({
          model: config.LLM_MODEL,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: false,
        }),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeout);
      lastError =
        err instanceof Error ? err : new Error(String(err));

      if (lastError.name === "AbortError") {
        lastError = new Error(
          `LLM request timed out after ${config.LLM_REQUEST_TIMEOUT_MS}ms`,
        );
      }

      recordFailure();
      continue;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");

      if (RETRYABLE_STATUS_CODES.has(response.status)) {
        lastError = new Error(
          `LLM returned ${response.status}: ${body.slice(0, 300)}`,
        );
        recordFailure();
        continue;
      }

      // Non-retryable error
      recordFailure();
      throw new Error(
        `LLM request failed (${response.status}): ${body.slice(0, 500)}`,
      );
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content ?? "";
    const durationMs = Date.now() - startTime;

    recordSuccess();

    logger.info(
      {
        durationMs,
        model: config.LLM_MODEL,
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
        totalTokens: data.usage?.total_tokens,
        attempt,
      },
      "LLM request completed",
    );

    return content;
  }

  recordFailure();
  throw lastError ?? new Error("LLM request failed after all retries");
}

// ─── Structured JSON Completion with Validation + Retry ──────────────────────

export async function llmJsonCompletion<T>(opts: {
  systemPrompt: string;
  userPrompt: string;
  validate: (parsed: unknown) => T;
  temperature?: number;
  maxTokens?: number;
  maxRetries?: number;
}): Promise<LlmResponse<T>> {
  const { systemPrompt, userPrompt, validate, temperature, maxTokens } = opts;
  const maxRetries = opts.maxRetries ?? 1;
  const logger = getLogger();

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let rawContent: string;
    try {
      rawContent = await chatCompletion(messages, temperature, maxTokens);
    } catch (err) {
      return {
        ok: false,
        error: `LLM request failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    // Attempt 1: parse raw
    try {
      const parsed = JSON.parse(rawContent);
      const validated = validate(parsed);
      return { ok: true, data: validated, rawContent };
    } catch {
      // Attempt 2: repair then parse
      try {
        const repaired = repairJson(rawContent);
        const parsed = JSON.parse(repaired);
        const validated = validate(parsed);
        logger.debug("JSON required repair before parsing");
        return { ok: true, data: validated, rawContent: repaired };
      } catch (repairErr) {
        if (attempt < maxRetries) {
          messages.push(
            { role: "assistant", content: rawContent },
            {
              role: "user",
              content:
                "Your previous response was not valid JSON. Please respond with ONLY a valid JSON object, no markdown, no explanation, just the JSON.",
            },
          );
          continue;
        }

        return {
          ok: false,
          error: `Failed to parse LLM JSON after ${maxRetries + 1} attempts: ${
            repairErr instanceof Error ? repairErr.message : String(repairErr)
          }`,
          rawContent,
        };
      }
    }
  }

  return { ok: false, error: "Exhausted retries" };
}

// ─── Health Check ────────────────────────────────────────────────────────────

export async function checkLlmHealth(): Promise<boolean> {
  const config = getConfig();
  const ollamaBase = config.LLM_BASE_URL.replace(/\/v1\/?$/, "");

  const endpoints = [
    { url: `${config.LLM_BASE_URL}/models`, method: "GET" as const },
    { url: `${ollamaBase}/api/tags`, method: "GET" as const },
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, {
        method: ep.method,
        headers: { Authorization: `Bearer ${config.LLM_API_KEY}` },
        signal: AbortSignal.timeout(5_000),
      });
      if (res.ok) return true;
    } catch {
      // try next
    }
  }

  // Last resort: minimal chat completion
  try {
    const res = await fetch(`${config.LLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: config.LLM_MODEL,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
