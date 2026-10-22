/**
 * Universal (Server & Browser) logger for the Next.js Frontend.
 * In Server/Terminal: uses ANSI colored tags and timestamps.
 * In Browser: uses CSS-styled console badges for high visibility.
 */

const isServer = typeof window === "undefined";

// ANSI terminal colors for server-side terminal rendering
const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
};

// CSS styles for browser devtools console
const BROWSER_STYLES = {
  badge: "color: white; font-weight: bold; border-radius: 3px; padding: 2px 5px;",
  tag: "color: #3b82f6; font-weight: bold;",
  dim: "color: #888; font-size: 0.9em;",
  info: "background: #2563eb;",
  warn: "background: #d97706;",
  error: "background: #dc2626;",
  api: "background: #7c3aed;",
};

function getTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

class FrontendLogger {
  info(tag: string, message: string, data?: unknown): void {
    if (isServer) {
      console.log(
        `${ANSI.dim}${getTimestamp()}${ANSI.reset} ${ANSI.bold}${ANSI.green}[FE-INFO]${ANSI.reset} ${ANSI.cyan}[${tag}]${ANSI.reset} ${message}`,
        data !== undefined ? data : "",
      );
    } else {
      console.log(
        `%cFE-INFO%c %c[${tag}]%c ${message}`,
        `${BROWSER_STYLES.badge} ${BROWSER_STYLES.info}`,
        "",
        BROWSER_STYLES.tag,
        "",
        data !== undefined ? data : "",
      );
    }
  }

  warn(tag: string, message: string, data?: unknown): void {
    if (isServer) {
      console.warn(
        `${ANSI.dim}${getTimestamp()}${ANSI.reset} ${ANSI.bold}${ANSI.yellow}[FE-WARN]${ANSI.reset} ${ANSI.cyan}[${tag}]${ANSI.reset} ${message}`,
        data !== undefined ? data : "",
      );
    } else {
      console.warn(
        `%cFE-WARN%c %c[${tag}]%c ${message}`,
        `${BROWSER_STYLES.badge} ${BROWSER_STYLES.warn}`,
        "",
        BROWSER_STYLES.tag,
        "",
        data !== undefined ? data : "",
      );
    }
  }

  error(tag: string, message: string, error?: unknown): void {
    if (isServer) {
      console.error(
        `${ANSI.dim}${getTimestamp()}${ANSI.reset} ${ANSI.bold}${ANSI.red}[FE-ERROR]${ANSI.reset} ${ANSI.red}[${tag}]${ANSI.reset} ${message}`,
        error !== undefined ? error : "",
      );
    } else {
      console.error(
        `%cFE-ERR%c %c[${tag}]%c ${message}`,
        `${BROWSER_STYLES.badge} ${BROWSER_STYLES.error}`,
        "",
        BROWSER_STYLES.tag,
        "",
        error !== undefined ? error : "",
      );
    }
  }

  api(method: string, path: string, status?: number, durationMs?: number, meta?: unknown): void {
    const durStr = durationMs !== undefined ? `(${durationMs.toFixed(0)}ms)` : "";
    if (isServer) {
      const statusColor = status && status >= 400 ? ANSI.red : ANSI.green;
      console.log(
        `${ANSI.dim}${getTimestamp()}${ANSI.reset} ${ANSI.bold}${ANSI.magenta}[FE:API]${ANSI.reset} ${method.toUpperCase()} ${path} -> ${statusColor}${status ?? ""}${ANSI.reset} ${ANSI.dim}${durStr}${ANSI.reset}`,
        meta !== undefined ? meta : "",
      );
    } else {
      const badgeColor = status && status >= 400 ? BROWSER_STYLES.error : BROWSER_STYLES.api;
      console.log(
        `%cAPI%c ${method.toUpperCase()} ${path} %c${status ? `[${status}]` : ""} ${durStr}%c`,
        `${BROWSER_STYLES.badge} ${badgeColor}`,
        "",
        BROWSER_STYLES.dim,
        "",
        meta !== undefined ? meta : "",
      );
    }
  }
}

export const logger = new FrontendLogger();
