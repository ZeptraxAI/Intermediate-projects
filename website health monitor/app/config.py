import os
import json
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional

# Base directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Data directory paths
DATA_DIR = BASE_DIR / "data"
SCREENSHOTS_DIR = DATA_DIR / "screenshots"

# Ensure directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

# Configuration File Path
CONFIG_FILE = DATA_DIR / "config.json"
SITES_FILE = DATA_DIR / "sites.json"

class WebsiteTarget(BaseModel):
    id: str
    name: str
    url: str
    check_type: str = "request"  # "request" (fast) or "browser" (Playwright full render)
    timeout_seconds: int = 10
    latency_threshold_ms: int = 2000  # Trigger alert if latency exceeds this

class AppSettings(BaseModel):
    check_interval_minutes: int = 5
    smtp_server: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    alert_receiver_email: Optional[str] = None
    enable_email_alerts: bool = False

def get_default_sites() -> List[WebsiteTarget]:
    return [
        WebsiteTarget(
            id="google",
            name="Google",
            url="https://www.google.com",
            check_type="request",
            timeout_seconds=5,
            latency_threshold_ms=1000
        ),
        WebsiteTarget(
            id="github",
            name="GitHub",
            url="https://github.com",
            check_type="browser",
            timeout_seconds=15,
            latency_threshold_ms=3000
        ),
        WebsiteTarget(
            id="httpbin_ok",
            name="Httpbin (OK Test)",
            url="https://httpbin.org/status/200",
            check_type="request",
            timeout_seconds=10,
            latency_threshold_ms=1500
        ),
        WebsiteTarget(
            id="httpbin_slow",
            name="Httpbin (Slow Test)",
            url="https://httpbin.org/delay/5",
            check_type="request",
            timeout_seconds=10,
            latency_threshold_ms=2000
        ),
        WebsiteTarget(
            id="httpbin_404",
            name="Httpbin (404 Down Test)",
            url="https://httpbin.org/status/404",
            check_type="request",
            timeout_seconds=10,
            latency_threshold_ms=2000
        )
    ]

def load_sites() -> List[WebsiteTarget]:
    if not SITES_FILE.exists():
        sites = get_default_sites()
        save_sites(sites)
        return sites
    try:
        with open(SITES_FILE, "r") as f:
            data = json.load(f)
            return [WebsiteTarget(**s) for s in data]
    except Exception as e:
        print(f"Error loading sites: {e}")
        return get_default_sites()

def save_sites(sites: List[WebsiteTarget]):
    try:
        with open(SITES_FILE, "w") as f:
            json.dump([s.dict() for s in sites], f, indent=4)
    except Exception as e:
        print(f"Error saving sites: {e}")

def load_settings() -> AppSettings:
    if not CONFIG_FILE.exists():
        settings = AppSettings()
        save_settings(settings)
        return settings
    try:
        with open(CONFIG_FILE, "r") as f:
            data = json.load(f)
            return AppSettings(**data)
    except Exception as e:
        print(f"Error loading settings: {e}")
        return AppSettings()

def save_settings(settings: AppSettings):
    try:
        with open(CONFIG_FILE, "w") as f:
            json.dump(settings.dict(), f, indent=4)
    except Exception as e:
        print(f"Error saving settings: {e}")
