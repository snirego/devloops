import pino from "pino";

import { getConfig } from "../config.js";

let _logger: pino.Logger | null = null;

export function createLogger(): pino.Logger {
  if (_logger) return _logger;

  const config = getConfig();

  _logger = pino({
    level: config.LOG_LEVEL,
    transport:
      process.env.NODE_ENV !== "production"
        ? { target: "pino/file", options: { destination: 1 } }
        : undefined,
    formatters: {
      level(label) {
        return { level: label };
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    base: { service: "devloops-llm" },
  });

  return _logger;
}

export function getLogger(): pino.Logger {
  if (!_logger) return createLogger();
  return _logger;
}
