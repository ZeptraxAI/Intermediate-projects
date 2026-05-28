import sys
import asyncio
import os
from fastapi import FastAPI, BackgroundTasks, HTTPException, status
from fastapi.responses import FileResponse, JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
from pathlib import Path

# Fix Windows asyncio loop policy for Playwright subprocesses inside Uvicorn
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from app.config import (
    load_sites,
    save_sites,
    load_settings,
    save_settings,
    WebsiteTarget,
    AppSettings,
    BASE_DIR,
    SCREENSHOTS_DIR
)
from app.monitor import run_all_checks, execute_health_check_for_site
from app.storage import get_logs_df, export_excel_report, REPORT_EXCEL
from app.analyzer import get_all_sites_statistics, get_site_statistics

app = FastAPI(
    title="Website Health Monitor & Reporter",
    description="DevOps-style real-time website monitoring and analytics API",
    version="1.0.0"
)

# Enable CORS for local development dashboard access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for controlling background schedules
background_task_running = False

# Ensure static directories exist
STATIC_DIR = BASE_DIR / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)
(STATIC_DIR / "css").mkdir(parents=True, exist_ok=True)
(STATIC_DIR / "js").mkdir(parents=True, exist_ok=True)

# Helper: Get current status of all sites based on logs
def get_current_status_data() -> List[Dict[str, Any]]:
    sites = load_sites()
    df = get_logs_df()
    
    status_list = []
    for site in sites:
        site_logs = df[df["site_id"] == site.id] if not df.empty else None
        
        if site_logs is not None and not site_logs.empty:
            last_record = site_logs.iloc[-1]
            status_list.append({
                "id": site.id,
                "name": site.name,
                "url": site.url,
                "check_type": site.check_type,
                "is_up": bool(last_record["is_up"]),
                "status_code": int(last_record["status_code"]),
                "latency_ms": float(last_record["response_time_ms"]),
                "timestamp": str(last_record["timestamp"]),
                "error_message": str(last_record["error_message"]) if last_record["error_message"] else "",
                "screenshot_path": str(last_record["screenshot_path"]) if last_record["screenshot_path"] else ""
            })
        else:
            status_list.append({
                "id": site.id,
                "name": site.name,
                "url": site.url,
                "check_type": site.check_type,
                "is_up": True,
                "status_code": 0,
                "latency_ms": 0.0,
                "timestamp": "Never checked",
                "error_message": "",
                "screenshot_path": ""
            })
    return status_list

# --- API Routes ---

@app.get("/api/status")
async def get_status():
    """
    Returns the latest recorded status of all monitored websites.
    """
    try:
        return get_current_status_data()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch status: {e}")

@app.post("/api/check")
async def trigger_check(background_tasks: BackgroundTasks):
    """
    Triggers an immediate, on-demand health check of all monitored sites.
    Runs asynchronously in the background.
    """
    try:
        background_tasks.add_task(run_all_checks)
        return {"status": "success", "message": "Manual health check triggered in background."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to trigger check: {e}")

@app.get("/api/history")
async def get_history(limit: int = 100):
    """
    Returns the raw historical checks log (up to `limit` entries).
    """
    try:
        df = get_logs_df()
        if df.empty:
            return []
        
        # Sort by timestamp descending
        df = df.sort_values(by="timestamp", ascending=False).head(limit)
        
        # Replace NaN with empty string
        df = df.fillna("")
        return df.to_dict(orient="records")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load history: {e}")

@app.get("/api/stats")
async def get_statistics():
    """
    Runs NumPy statistical analysis on historical log data.
    """
    try:
        stats = get_all_sites_statistics()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compile statistics: {e}")

@app.get("/api/export")
async def export_excel():
    """
    Generates a beautifully styled Excel health report on the fly and serves it.
    """
    try:
        file_path = export_excel_report()
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Excel file could not be generated.")
        return FileResponse(
            path=file_path,
            filename=f"website_health_report_{Path(file_path).name}",
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export Excel: {e}")

@app.get("/api/alerts-preview")
async def get_alerts_preview():
    """
    Returns the HTML content of the last sent alert so users can preview email alerts.
    """
    from app.notifier import ALERTS_LOG
    if not ALERTS_LOG.exists():
        return HTMLResponse("<h3>No email alerts logged locally yet.</h3>", status_code=200)
    try:
        with open(ALERTS_LOG, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Split by the 80 character equals divider
        divider = "=" * 80
        blocks = content.split(divider)
        
        # Extract the last HTML block
        for block in reversed(blocks):
            html_start = block.find("<!DOCTYPE html>")
            if html_start != -1:
                return HTMLResponse(content=block[html_start:], status_code=200)
                
        # Try raw rfind search
        html_start = content.rfind("<!DOCTYPE html>")
        if html_start != -1:
            return HTMLResponse(content=content[html_start:], status_code=200)
            
        return HTMLResponse("<h3>No structured HTML alerts found.</h3>", status_code=200)
    except Exception as e:
        return HTMLResponse(f"<h3>Error loading preview: {e}</h3>", status_code=500)

# --- Site Management ---

@app.post("/api/sites", status_code=status.HTTP_201_CREATED)
async def add_site(site: WebsiteTarget):
    """
    Adds a new website to the monitoring target list.
    """
    sites = load_sites()
    if any(s.id == site.id for s in sites):
        raise HTTPException(status_code=400, detail=f"Site with ID '{site.id}' already exists.")
    
    sites.append(site)
    save_sites(sites)
    return {"status": "success", "message": f"Website '{site.name}' added successfully."}

@app.delete("/api/sites/{site_id}")
async def delete_site(site_id: str):
    """
    Removes a website from the monitoring target list.
    """
    sites = load_sites()
    filtered_sites = [s for s in sites if s.id != site_id]
    
    if len(filtered_sites) == len(sites):
        raise HTTPException(status_code=404, detail=f"Site with ID '{site_id}' not found.")
        
    save_sites(filtered_sites)
    return {"status": "success", "message": f"Website with ID '{site_id}' removed."}

# --- App Settings Management ---

@app.get("/api/settings")
async def get_settings():
    return load_settings()

@app.post("/api/settings")
async def update_settings(settings: AppSettings):
    save_settings(settings)
    return {"status": "success", "message": "Settings updated successfully."}

# --- Mounts and Static Page Serving ---

# Route to serve the main HTML index dashboard page
@app.get("/")
async def serve_dashboard():
    dashboard_path = STATIC_DIR / "index.html"
    if not dashboard_path.exists():
        raise HTTPException(status_code=404, detail="Dashboard index.html not found.")
    return FileResponse(str(dashboard_path))

# Mount static/screenshots folder so dashboard can load them
app.mount("/static/screenshots", StaticFiles(directory=str(SCREENSHOTS_DIR)), name="screenshots")
# Mount static asset files (CSS/JS)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# --- Background Task Scheduler Loop ---

async def monitoring_scheduler_loop():
    """
    A continuous background thread/loop using asyncio to schedule checks
    periodically according to AppSettings.
    """
    global background_task_running
    background_task_running = True
    print("[Scheduler] Background Monitoring Scheduler loop initiated!")
    
    # Run immediate check on startup
    try:
        await run_all_checks()
    except Exception as e:
        print(f"Startup check failed: {e}")
        
    while background_task_running:
        try:
            settings = load_settings()
            # Dynamic interval check in minutes
            interval_seconds = max(settings.check_interval_minutes * 60, 30)
            print(f"[Scheduler] Next scheduled check in {settings.check_interval_minutes} minutes...")
            await asyncio.sleep(interval_seconds)
            
            # Execute run
            await run_all_checks()
        except asyncio.CancelledError:
            print("[Scheduler] Scheduler loop cancelled.")
            break
        except Exception as e:
            print(f"[Scheduler Error] Error in scheduler loop: {e}")
            await asyncio.sleep(10)  # Short delay on error before retrying

@app.on_event("startup")
async def startup_event():
    # Start scheduler as a non-blocking background task
    asyncio.create_task(monitoring_scheduler_loop())

@app.on_event("shutdown")
async def shutdown_event():
    global background_task_running
    background_task_running = False
