// Structured Logger — lightweight, no external dependencies
// JSON output in production, human-readable in development

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

type LogContext = Record<string, unknown>;

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  requestId?: string;
  [key: string]: unknown;
}

interface LoggerOptions {
  module: string;
  defaultContext?: LogContext;
}

const MIN_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ??
  (process.env.NODE_ENV === "production" ? "info" : "debug");

const IS_PRODUCTION = process.env.NODE_ENV === "production";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[MIN_LEVEL];
}

function serializeError(err: unknown): Record<string, unknown> | undefined {
  if (!err) return undefined;
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      ...(IS_PRODUCTION ? {} : { stack: err.stack }),
    };
  }
  return { value: String(err) };
}

function formatDev(entry: LogEntry): string {
  const { timestamp, level, module, message, ...rest } = entry;
  const time = timestamp.slice(11, 23); // HH:mm:ss.SSS
  const tag = level.toUpperCase().padEnd(5);
  const ctx =
    Object.keys(rest).length > 0
      ? " " + JSON.stringify(rest)
      : "";
  return `${time} ${tag} [${module}] ${message}${ctx}`;
}

function emit(entry: LogEntry): void {
  const output = IS_PRODUCTION ? JSON.stringify(entry) : formatDev(entry);

  switch (entry.level) {
    case "error":
      console.error(output);
      break;
    case "warn":
      console.warn(output);
      break;
    case "debug":
      console.debug(output);
      break;
    default:
      console.log(output);
  }
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  child(extra: LogContext): Logger;
}

export function createLogger(options: LoggerOptions): Logger {
  const { module, defaultContext = {} } = options;

  function log(level: LogLevel, message: string, context?: LogContext): void {
    if (!shouldLog(level)) return;

    const merged = { ...defaultContext, ...context };

    // Pull error field and serialize it
    if (merged.error != null) {
      merged.error = serializeError(merged.error);
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      ...merged,
    };

    emit(entry);
  }

  const logger: Logger = {
    debug: (msg, ctx?) => log("debug", msg, ctx),
    info: (msg, ctx?) => log("info", msg, ctx),
    warn: (msg, ctx?) => log("warn", msg, ctx),
    error: (msg, ctx?) => log("error", msg, ctx),
    child(extra: LogContext): Logger {
      return createLogger({
        module,
        defaultContext: { ...defaultContext, ...extra },
      });
    },
  };

  return logger;
}

// ── Request ID helpers ──────────────────────────────────────────────

export const REQUEST_ID_HEADER = "X-Request-Id";

export function generateRequestId(): string {
  return crypto.randomUUID();
}
