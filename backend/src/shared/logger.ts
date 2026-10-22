/**
 * High-visibility, structured ANSI colored logger for backend services.
 * Provides unified timestamping, log levels, module tags, and timing metrics.
 */

// ANSI escape codes for rich terminal styling
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

const COLORS = {
  DEBUG: "\x1b[36m",   // Cyan
  INFO: "\x1b[32m",    // Green
  WARN: "\x1b[33m",    // Yellow
  ERROR: "\x1b[31m",   // Red
  HTTP: "\x1b[35m",    // Magenta
  AI: "\x1b[34m",      // Blue
  SUCCESS: "\x1b[92m", // Bright Green
} as const;

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

class Logger {
  private formatTimestamp(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const y = now.getFullYear();
    const m = pad(now.getMonth() + 1);
    const d = pad(now.getDate());
    const hh = pad(now.getHours());
    const mm = pad(now.getMinutes());
    const ss = pad(now.getSeconds());
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
  }

  private print(
    level: LogLevel,
    tag: string,
    message: string,
    meta?: unknown,
  ): void {
    const timeStr = `${DIM}${this.formatTimestamp()}${RESET}`;
    const color = COLORS[level] || RESET;
    const levelStr = `${BOLD}${color}[${level.padEnd(5)}]${RESET}`;
    const tagColor = tag.includes("HTTP")
      ? COLORS.HTTP
      : tag.includes("AI")
      ? COLORS.AI
      : BOLD;
    const tagStr = `${tagColor}[${tag}]${RESET}`;

    if (meta !== undefined) {
      if (meta instanceof Error) {
        console.log(`${timeStr} ${levelStr} ${tagStr} ${message}`);
        console.error(`${color}${meta.stack || meta.message}${RESET}`);
      } else {
        const metaStr =
          typeof meta === "object" ? JSON.stringify(meta, null, 2) : String(meta);
        console.log(`${timeStr} ${levelStr} ${tagStr} ${message}\n${DIM}${metaStr}${RESET}`);
      }
    } else {
      console.log(`${timeStr} ${levelStr} ${tagStr} ${message}`);
    }
  }

  debug(tag: string, message: string, meta?: unknown): void {
    if (process.env.NODE_ENV !== "production" || process.env.LOG_LEVEL === "debug") {
      this.print("DEBUG", tag, message, meta);
    }
  }

  info(tag: string, message: string, meta?: unknown): void {
    this.print("INFO", tag, message, meta);
  }

  warn(tag: string, message: string, meta?: unknown): void {
    this.print("WARN", tag, message, meta);
  }

  error(tag: string, message: string, meta?: unknown): void {
    this.print("ERROR", tag, message, meta);
  }

  http(method: string, path: string, status: number, durationMs: number): void {
    const timeStr = `${DIM}${this.formatTimestamp()}${RESET}`;
    let statusColor: string = COLORS.INFO;
    if (status >= 500) statusColor = COLORS.ERROR;
    else if (status >= 400) statusColor = COLORS.WARN;
    else if (status >= 300) statusColor = COLORS.DEBUG;

    const methodColor = BOLD;
    const tagStr = `${COLORS.HTTP}[HTTP]${RESET}`;
    const statusStr = `${statusColor}${status}${RESET}`;
    const durStr = `${DIM}(${durationMs.toFixed(1)}ms)${RESET}`;

    console.log(
      `${timeStr} ${tagStr} ${methodColor}${method.padEnd(6)}${RESET} ${path} -> ${statusStr} ${durStr}`,
    );
  }
}

export const logger = new Logger();
