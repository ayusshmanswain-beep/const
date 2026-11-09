// ==============================================================================
// CONSTRUCT360 STRUCTURED JSON LOGGER
// High-Performance, Zero-Dependency Serverless JSON Logger
// ==============================================================================

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  companyId?: string;
  userId?: string;
  action?: string;
  route?: string;
  durationMs?: number;
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

class StructuredLogger {
  private levelRank: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  private currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || "info";

  private shouldLog(level: LogLevel): boolean {
    return this.levelRank[level] >= this.levelRank[this.currentLevel];
  }

  private write(level: LogLevel, message: string, context?: LogContext, err?: unknown): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(context && Object.keys(context).length > 0 ? { context } : {}),
    };

    if (err instanceof Error) {
      entry.error = {
        name: err.name,
        message: err.message,
        code: (err as { code?: string }).code,
        stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
      };
    } else if (err) {
      entry.error = {
        name: "UnknownError",
        message: String(err),
      };
    }

    const json = JSON.stringify(entry);

    if (level === "error") {
      console.error(json);
    } else if (level === "warn") {
      console.warn(json);
    } else {
      console.log(json);
    }
  }

  public debug(message: string, context?: LogContext): void {
    this.write("debug", message, context);
  }

  public info(message: string, context?: LogContext): void {
    this.write("info", message, context);
  }

  public warn(message: string, context?: LogContext, err?: unknown): void {
    this.write("warn", message, context, err);
  }

  public error(message: string, context?: LogContext, err?: unknown): void {
    this.write("error", message, context, err);
  }
}

export const logger = new StructuredLogger();
