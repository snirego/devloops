import { z } from "zod";

const envSchema = z.object({
  // ── Required ────────────────────────────────────────────────────────────
  POSTGRES_URL: z.string().min(1, "POSTGRES_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  API_SECRET: z.string().min(16, "API_SECRET must be at least 16 characters"),

  // ── LLM Provider ───────────────────────────────────────────────────────
  LLM_BASE_URL: z.string().url().default("https://api.openai.com/v1"),
  LLM_MODEL: z.string().default("gpt-4o-mini"),
  LLM_API_KEY: z.string().min(1, "LLM_API_KEY is required"),

  // ── Tuning ─────────────────────────────────────────────────────────────
  PORT: z.coerce.number().int().positive().default(3001),
  LLM_MAX_CONCURRENCY: z.coerce.number().int().positive().default(5),
  LLM_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
  JOB_MAX_RETRIES: z.coerce.number().int().min(0).default(3),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(50),
  ALLOWED_ORIGINS: z.string().default("*"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
});

export type Config = z.infer<typeof envSchema>;

let _config: Config | null = null;

export function loadConfig(): Config {
  if (_config) return _config;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    console.error(`\n[config] Invalid environment variables:\n${formatted}\n`);
    process.exit(1);
  }

  _config = result.data;
  return _config;
}

export function getConfig(): Config {
  if (!_config) return loadConfig();
  return _config;
}
