import sys
import asyncio
import os

# On Windows, ensure ProactorEventLoop is used so Playwright can launch browser subprocesses
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

if __name__ == "__main__":
    import uvicorn
    # Note: On Windows with ProactorEventLoop (required for Playwright), uvicorn's reload=True
    # causes [WinError 87] (The parameter is incorrect) because socket handles cannot be
    # duplicated across reload supervisor process boundaries via IOCP.
    reload_enabled = os.getenv("UVICORN_RELOAD", "false").lower() in ("true", "1")
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=reload_enabled)

