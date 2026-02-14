/**
 * LLM client module.
 *
 * In production: delegates to the devloops-llm service for health checks.
 * In local dev: calls the local LLM endpoint directly.
 *
 * Environment variables:
 *   LOCAL_LLM_BASE_URL  — e.g. http://localhost:11434/v1
 *   LOCAL_LLM_MODEL     — e.g. qwen2.5-coder:7b-instruct
 *   LOCAL_LLM_API_KEY   — dummy value, defaults to "ollama"
 *
 *   LLM_SERVICE_URL     — e.g. https://devloops-llm.up.railway.app
 *   LLM_SERVICE_SECRET  — shared secret
 */

const getLlmConfig = () => ({
  baseUrl: process.env.LOCAL_LLM_BASE_URL ?? "http://localhost:11434/v1",
  model: process.env.LOCAL_LLM_MODEL ?? "qwen2.5-coder:7b-instruct",
  apiKey: process.env.LOCAL_LLM_API_KEY ?? "ollama",
});

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

  if (s.startsWith("```json")) s = s.slice(7);
  else if (s.startsWith("```")) s = s.slice(3);
  if (s.endsWith("```")) s = s.slice(0, -3);
  s = s.trim();

  s = s.replace(/(?<!["\w])\/\/[^\n]*/g, "");
  s = s.replace(/\/\*[\s\S]*?\*\//g, "");

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

export async function llmHealthCheck(): Promise<{
  ok: boolean;
  model: string;
  error?: string;
  mode?: string;
}> {
  // If LLM service is configured, check its health endpoint instead
  if (isLlmServiceConfigured()) {
    const svc = getLlmServiceConfig();
    try {
      const res = await fetch(`${svc.url}/ready`, {
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) {
        const data = (await res.json()) as { checks?: { llm?: boolean } };
        return {
          ok: data.checks?.llm ?? true,
          model: "via devloops-llm service",
          mode: "remote",
        };
      }
      return {
        ok: false,
        model: "via devloops-llm service",
        error: `Service returned ${res.status}`,
        mode: "remote",
      };
    } catch (err) {
      return {
        ok: false,
        model: "via devloops-llm service",
        error: err instanceof Error ? err.message : String(err),
        mode: "remote",
      };
    }
  }

  // Local LLM health check (original behavior)
  const config = getLlmConfig();
  const ollamaBase = config.baseUrl.replace(/\/v1\/?$/, "");

  const endpoints = [
    { url: `${config.baseUrl}/models`, method: "GET" as const },
    { url: `${ollamaBase}/api/tags`, method: "GET" as const },
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, {
        method: ep.method,
        headers: { Authorization: `Bearer ${config.apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) return { ok: true, model: config.model, mode: "local" };
    } catch {
      // Try next
    }
  }

  try {
    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) return { ok: true, model: config.model, mode: "local" };
    return { ok: false, model: config.model, error: `All endpoints failed. Last: HTTP ${res.status}`, mode: "local" };
  } catch (err) {
    return { ok: false, model: config.model, error: err instanceof Error ? err.message : String(err), mode: "local" };
  }
}
