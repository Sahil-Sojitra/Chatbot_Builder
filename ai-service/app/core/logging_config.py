"""High-visibility structured colored logging configuration for FastAPI AI Service."""

import logging
import sys
import time
from typing import Callable
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# ANSI terminal formatting codes
RESET = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"

COLOR_MAP = {
    logging.DEBUG: "\033[36m",     # Cyan
    logging.INFO: "\033[32m",      # Green
    logging.WARNING: "\033[33m",   # Yellow
    logging.ERROR: "\033[31m",     # Red
    logging.CRITICAL: "\033[35m",  # Magenta
}

TAG_COLOR = "\033[94m"   # Bright Blue
HTTP_COLOR = "\033[95m"  # Bright Magenta


class ColoredFormatter(logging.Formatter):
    """Custom logging formatter that injects terminal colors, timestamps, and tags."""

    def format(self, record: logging.LogRecord) -> str:
        color = COLOR_MAP.get(record.levelno, RESET)
        level_name = f"{BOLD}{color}[{record.levelname[:5].ljust(5)}]{RESET}"
        time_str = f"{DIM}{self.formatTime(record, '%Y-%m-%d %H:%M:%S')}{RESET}"
        
        # Shorten module name for clean output (e.g. app.services.crawler -> crawler)
        mod = record.name.split(".")[-1]
        mod_str = f"{TAG_COLOR}[{mod}]{RESET}"

        message = record.getMessage()
        return f"{time_str} {level_name} {mod_str} {message}"


def setup_logging(level: str = "INFO") -> None:
    """Configures root logger and uvicorn loggers to use the colored formatter."""
    log_level = getattr(logging, level.upper(), logging.INFO)
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Clear existing handlers to avoid duplicates
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(ColoredFormatter())
    root_logger.addHandler(console_handler)

    # Configure explicit loggers for the application
    for log_name in ("app", "ai_service", "uvicorn", "uvicorn.error", "uvicorn.access"):
        sub_logger = logging.getLogger(log_name)
        sub_logger.setLevel(log_level)
        sub_logger.handlers = [console_handler]
        sub_logger.propagate = False


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """ASGI middleware that logs incoming HTTP requests and response times."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.perf_counter()
        method = request.method
        path = request.url.path
        client = request.client.host if request.client else "unknown"

        # Skip spamming health check logs if desired, or keep clear
        is_health = path == "/health" or path == "/"
        if not is_health:
            logging.getLogger("ai_service.http").info(
                f"{HTTP_COLOR}--> [HTTP IN]{RESET} {BOLD}{method}{RESET} {path} from {client}"
            )

        try:
            response = await call_next(request)
            duration = time.perf_counter() - start_time
            dur_str = f"{duration:.3f}s" if duration >= 1.0 else f"{duration * 1000:.1f}ms"

            status_code = response.status_code
            status_color = (
                "\033[32m" if status_code < 300 else
                "\033[33m" if status_code < 400 else
                "\033[31m"
            )

            if not is_health or status_code >= 400:
                logging.getLogger("ai_service.http").info(
                    f"{HTTP_COLOR}<-- [HTTP OUT]{RESET} {status_color}{status_code}{RESET} {method} {path} ({dur_str})"
                )

            return response
        except Exception as exc:
            duration = time.perf_counter() - start_time
            logging.getLogger("ai_service.http").error(
                f"{HTTP_COLOR}<-- [HTTP ERR]{RESET} \033[31mFAILED\033[0m {method} {path} ({duration:.2f}s): {exc}"
            )
            raise exc
