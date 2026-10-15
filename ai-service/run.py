import sys
import asyncio

# On Windows, ensure ProactorEventLoop is used so Playwright can launch browser subprocesses
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    try:
        import uvicorn.loops.asyncio
        uvicorn.loops.asyncio.asyncio_loop_factory = lambda use_subprocess=False: asyncio.ProactorEventLoop
        import uvicorn.loops.auto
        uvicorn.loops.auto.auto_loop_factory = lambda use_subprocess=False: asyncio.ProactorEventLoop
    except ImportError:
        pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
