/**
 * LLM client module.
 *
 * Health-checks the actual LLM endpoint (OpenAI-compatible) directly,
 * falling back through multiple strategies.
 *
 * Environment variables:
 *   LOCAL_LLM_BASE_URL  — e.g. http://localhost:11434/v1
 *   LOCAL_LLM_MODEL     — e.g. qwen2.5-coder:7b-instruct
 *   LOCAL_LLM_API_KEY   — dummy value, defaults to "ollama"
 *
 *   LLM_BASE_URL        — e.g. http://ollama.railway.internal:11434/v1
 *   LLM_API_KEY         — API key for the LLM endpoint
 *   LLM_MODEL           — model name
 *
 *   LLM_SERVICE_URL     — e.g. https://devloops-llm.up.railway.app
 *   LLM_SERVICE_SECRET  — shared secret
 */

/**
 * Resolve the effective LLM config.
 * Priority: production (LLM_BASE_URL) → local (LOCAL_LLM_BASE_URL) → fallback.
 */
const getLlmConfig = () => ({
  baseUrl:
    process.env.LLM_BASE_URL ??
    process.env.LOCAL_LLM_BASE_URL ??
    "http://localhost:11434/v1",
  model:
    process.env.LLM_MODEL ??
    process.env.LOCAL_LLM_MODEL ??
    "qwen2.5-coder:7b-instruct",
  apiKey:
    process.env.LLM_API_KEY ??
    process.env.LOCAL_LLM_API_KEY ??
    "ollama",
});

/** Local-only LLM config (used as last-resort fallback in health checks) */
function getLocalLlmConfig() {
  return {
    baseUrl: process.env.LOCAL_LLM_BASE_URL ?? "http://localhost:11434/v1",
    model: process.env.LOCAL_LLM_MODEL ?? "qwen2.5-coder:7b-instruct",
    apiKey: process.env.LOCAL_LLM_API_KEY ?? "ollama",
  };
}

function getLlmServiceConfig() {
  return {
    url: process.env.LLM_SERVICE_URL ?? "",
    secret: process.env.LLM_SERVICE_SECRET ?? "",
  };
}

function isLlmServiceConfigured(): boolean {
  const config = getLlmServiceConfig();
  return !!(config.url && config.secret);
}

function isRemoteLlmConfigured(): boolean {
  return !!process.env.LLM_BASE_URL;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatMessage {
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
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
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

// ─── Minimal JSON Repair ─────────────────────────────────────────────────────

function repairJson(raw: string): string {
  let s = raw.trim();

  // Strip markdown code fences
  if (s.startsWith("```json")) s = s.slice(7);
  else if (s.startsWith("```")) s = s.slice(3);
  if (s.endsWith("```")) s = s.slice(0, -3);
  s = s.trim();

  // Strip comments
  s = s.replace(/(?<!["\w])\/\/[^\n]*/g, "");
  s = s.replace(/\/\*[\s\S]*?\*\//g, "");

  // Fix garbled key prefixes: LLMs sometimes emit a stray character before a
  // quoted key (e.g. `G"title"` or ` G"key"`). Remove single non-whitespace
  // chars that appear right before a `"key":` pattern.
  s = s.replace(/([{,\[]\s*)[A-Z]"/g, '$1"');

  const startObj = s.indexOf("{");
  const startArr = s.indexOf("[");
  let start = -1;
  if (startObj === -1 && startArr === -1) return s;
  if (startObj === -1) start = startArr;
  else if (startArr === -1) start = startObj;
  else start = Math.min(startObj, startArr);

  s = s.slice(start);

  const openChar = s[0]!;
  const closeChar = openChar === "{" ? "}" : "]";
  let depth = 0;
  let end = -1;
  let inString = false;
  let escape = false;

  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (escape) { escape = false; continue; }
    if (c === "\\") { escape = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === openChar) depth++;
    if (c === closeChar) depth--;
    if (depth === 0) { end = i; break; }
  }

  if (end !== -1) {
    s = s.slice(0, end + 1);
  } else {
    let openBraces = 0;
    let openBrackets = 0;
    let inStr = false;
    let esc = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i]!;
      if (esc) { esc = false; continue; }
      if (c === "\\") { esc = true; continue; }
      if (c === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (c === "{") openBraces++;
      else if (c === "}") openBraces--;
      else if (c === "[") openBrackets++;
      else if (c === "]") openBrackets--;
    }
    s = s.replace(/,\s*"[^"]*"?\s*:?\s*"?[^"]*$/, "");
    s = s.replace(/,\s*$/, "");
    for (let i = 0; i < openBrackets; i++) s += "]";
    for (let i = 0; i < openBraces; i++) s += "}";
  }

  s = s.replace(/,\s*([\]}])/g, "$1");
  s = s.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
  s = s.replace(/:\s*'([^']*)'/g, ': "$1"');
  s = s.replace(/"([^"]*?)"/g, (_match, content: string) => {
    return '"' + content.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t") + '"';
  });

  return s;
}

// ─── Core Chat Completion (local fallback) ───────────────────────────────────

async function chatCompletion(
  messages: ChatMessage[],
  temperature = 0.1,
  maxTokens = 4096,
): Promise<string> {
  const config = getLlmConfig();
  const url = `${config.baseUrl}/chat/completions`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LLM request failed (${response.status}): ${body.slice(0, 500)}`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  return data.choices?.[0]?.message?.content ?? "";
}

// ─── Structured JSON Completion ──────────────────────────────────────────────

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

    try {
      const parsed = JSON.parse(rawContent);
      const validated = validate(parsed);
      return { ok: true, data: validated, rawContent };
    } catch {
      try {
        const repaired = repairJson(rawContent);
        const parsed = JSON.parse(repaired);
        const validated = validate(parsed);
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

/**
 * Probe an OpenAI-compatible base URL for liveness.
 * Tries /models first (lightweight), then falls back to /chat/completions.
 */
async function probeOpenAiEndpoint(
  baseUrl: string,
  apiKey: string,
  timeoutMs = 8_000,
): Promise<{ ok: boolean; error?: string }> {
  const ollamaBase = baseUrl.replace(/\/v1\/?$/, "");

  // Strategy 1: GET /models (standard OpenAI-compatible)
  // Strategy 2: GET /api/tags (Ollama-native)
  const lightEndpoints = [
    `${baseUrl}/models`,
    `${ollamaBase}/api/tags`,
  ];

  for (const url of lightEndpoints) {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) return { ok: true };
    } catch {
      // Try next
    }
  }

  // Strategy 3: minimal chat completion (heavier but definitive)
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "test",
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    // Even a 4xx model-not-found means the LLM server is alive
    if (res.ok || res.status === 404 || res.status === 400) {
      return { ok: true };
    }
    return { ok: false, error: `HTTP ${res.status}` };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function llmHealthCheck(): Promise<{
  ok: boolean;
  model: string;
  error?: string;
  mode?: string;
  checkedUrl?: string;
}> {
  // ── 1. Try the devloops-llm service (if configured) ───────────────────
  // In production, the devloops-llm service handles all LLM communication.
  // We consider it "online" if the service itself is responsive and its
  // infrastructure (Redis + Postgres) is healthy. The internal LLM
  // connectivity is the service's concern — it has retry logic, circuit
  // breakers, and queued job processing that handle transient LLM issues.
  if (isLlmServiceConfigured()) {
    const svc = getLlmServiceConfig();

    // Try /ready first (detailed health check)
    try {
      const res = await fetch(`${svc.url}/ready`, {
        signal: AbortSignal.timeout(8_000),
      });
      if (res.ok) {
        const data = (await res.json()) as {
          status?: string;
          checks?: { redis?: boolean; postgres?: boolean; llm?: boolean };
        };
        // Service is ready if its core infrastructure is up.
        // The LLM probe may fail transiently (cold start, model loading)
        // but jobs will still be queued and retried via BullMQ.
        const infraHealthy =
          data.checks?.redis !== false && data.checks?.postgres !== false;
        if (infraHealthy) {
          return {
            ok: true,
            model: data.checks?.llm
              ? "via devloops-llm service"
              : "via devloops-llm service (LLM warming up)",
            mode: "service",
            checkedUrl: svc.url,
          };
        }
      }
    } catch {
      // /ready failed — try lightweight /health as fallback
    }

    // Fallback: try /health (liveness probe — always 200 if process is alive)
    try {
      const res = await fetch(`${svc.url}/health`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (res.ok) {
        return {
          ok: true,
          model: "via devloops-llm service",
          mode: "service",
          checkedUrl: svc.url,
        };
      }
    } catch {
      // Service completely unreachable — fall through to direct LLM check
    }
  }

  // ── 2. Try the primary LLM endpoint (production LLM_BASE_URL first) ──
  // This path is used when running without the devloops-llm service
  // (local development with Ollama running directly).
  const primary = getLlmConfig();
  const primaryResult = await probeOpenAiEndpoint(primary.baseUrl, primary.apiKey);
  if (primaryResult.ok) {
    return {
      ok: true,
      model: primary.model,
      mode: isRemoteLlmConfigured() ? "remote" : "local",
      checkedUrl: primary.baseUrl,
    };
  }

  // ── 3. Try local fallback only if primary was remote ──────────────────
  if (isRemoteLlmConfigured()) {
    const local = getLocalLlmConfig();
    // Only try local if it's actually different from the primary we just tried
    if (local.baseUrl !== primary.baseUrl) {
      const localResult = await probeOpenAiEndpoint(local.baseUrl, local.apiKey, 5_000);
      if (localResult.ok) {
        return {
          ok: true,
          model: local.model,
          mode: "local",
          checkedUrl: local.baseUrl,
        };
      }
    }
  }

  // ── 4. All checks failed ──────────────────────────────────────────────
  const errors: string[] = [];
  if (isLlmServiceConfigured()) {
    errors.push(`service(${getLlmServiceConfig().url}): unreachable`);
  }
  errors.push(`primary(${primary.baseUrl}): ${primaryResult.error ?? "unreachable"}`);
  if (isRemoteLlmConfigured()) {
    const local = getLocalLlmConfig();
    if (local.baseUrl !== primary.baseUrl) {
      errors.push(`local(${local.baseUrl}): unreachable`);
    }
  }

  return {
    ok: false,
    model: primary.model,
    error: `All LLM endpoints unreachable: ${errors.join(", ")}`,
    mode: "none",
  };
}
