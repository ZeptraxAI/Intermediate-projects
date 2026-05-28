import uvicorn
import sys
import asyncio
import webbrowser
from pathlib import Path

# Fix Windows asyncio loop policy for Playwright subprocesses inside Uvicorn
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

# Ensure app is in path
sys.path.append(str(Path(__file__).resolve().parent))

if __name__ == "__main__":
    print("=" * 70)
    print("        >>> STARTING WEBSITE HEALTH MONITOR & REPORTER SERVER <<<")
    print("=" * 70)
    print("\n   - Telemetry API Docs: http://localhost:8000/docs")
    print("   - DevOps Web Dashboard: http://localhost:8000")
    print("\n   Launching local browser and starting uvicorn...\n")
    
    # Auto-open dashboard in default browser
    try:
        webbrowser.open("http://localhost:8000")
    except Exception as e:
        print(f"   Could not automatically open browser: {e}")

    # Spin up Uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
