/**
 * Structured JSON logger for API routes.
 *
 * Outputs structured JSON in production, readable text in development.
 * Replaces raw console.error/warn/log calls for better observability.
 */

type LogLevel = "info" | "warn" | "error";

interface LogContext {
  route?: string;
  userId?: string;
  [key: string]: unknown;
}

function log(level: LogLevel, message: string, context?: LogContext) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...context,
  };

  if (process.env.NODE_ENV === "production") {
    // Structured JSON for production log aggregation
    const output = JSON.stringify(entry);
    if (level === "error") {
      console.error(output);
    } else if (level === "warn") {
      console.warn(output);
    } else {
      console.log(output);
    }
  } else {
    // Readable format for development
    const prefix = `[${level.toUpperCase()}]`;
    const ctx = context
      ? ` ${Object.entries(context).map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`).join(" ")}`
      : "";
    if (level === "error") {
      console.error(`${prefix} ${message}${ctx}`);
    } else if (level === "warn") {
      console.warn(`${prefix} ${message}${ctx}`);
    } else {
      console.log(`${prefix} ${message}${ctx}`);
    }
  }
}

export const logger = {
  info: (message: string, context?: LogContext) => log("info", message, context),
  warn: (message: string, context?: LogContext) => log("warn", message, context),
  error: (message: string, context?: LogContext) => log("error", message, context),
};
