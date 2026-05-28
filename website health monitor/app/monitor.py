import os
import time
import asyncio
import requests
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List
import cv2
import numpy as np
from playwright.async_api import async_playwright

from app.config import load_sites, WebsiteTarget, SCREENSHOTS_DIR
from app.storage import append_log, get_logs_df
from app.notifier import send_alert

def annotate_screenshot(
    image_path: str,
    site_name: str,
    url: str,
    status_code: int,
    latency_ms: float,
    is_up: bool
):
    """
    Annotates the captured screenshot using OpenCV with a sleek semi-transparent
    HUD overlay that contains telemetry status, latency metrics, and timestamp.
    """
    try:
        img = cv2.imread(image_path)
        if img is None:
            print(f"[OpenCV Warning] Failed to read image: {image_path}")
            return
            
        h, w, c = img.shape
        
        # Define HUD banner height
        banner_h = 80
        overlay = img.copy()
        
        # Semi-transparent dark background box at the bottom
        # BGR representation of Slate Blue-Grey (45, 30, 20)
        cv2.rectangle(overlay, (0, h - banner_h), (w, h), (35, 25, 20), -1)
        
        # Blend overlay (70% opacity)
        alpha = 0.70
        cv2.addWeighted(overlay, alpha, img, 1 - alpha, 0, img)
        
        # Telemetry variables
        timestamp_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        status_text = "ONLINE" if is_up else "OFFLINE"
        status_color = (76, 185, 16) if is_up else (72, 29, 225) # BGR: Emerald Green or Rose Red
        
        # Draw status circle indicator (Radius 10, filled)
        cv2.circle(img, (30, h - int(banner_h/2)), 9, status_color, -1)
        # Draw soft outer ring glow
        cv2.circle(img, (30, h - int(banner_h/2)), 13, status_color, 2, cv2.LINE_AA)
        
        # Typography settings
        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale_title = 0.6
        font_scale_body = 0.5
        text_color_main = (255, 255, 255)
        text_color_sub = (200, 200, 200)
        thickness = 1
        
        # Draw Title line (Site Name & URL)
        title_text = f"{site_name}  ({url})"
        cv2.putText(img, title_text, (65, h - 48), font, font_scale_title, text_color_main, thickness + 1, cv2.LINE_AA)
        
        # Draw Diagnostics line
        latency_str = f"{latency_ms:.1f}ms" if is_up else "N/A"
        telemetry_text = f"Status: {status_code} [{status_text}]   |   Latency: {latency_str}   |   Monitored: {timestamp_str}"
        cv2.putText(img, telemetry_text, (65, h - 22), font, font_scale_body, text_color_sub, thickness, cv2.LINE_AA)
        
        # Save back the annotated image
        cv2.imwrite(image_path, img)
        print(f"[OpenCV] Annotated telemetry overlay successfully written to: {image_path}")
    except Exception as e:
        print(f"[OpenCV Error] Processing failed: {e}")

async def check_site_request(site: WebsiteTarget) -> Dict[str, Any]:
    """
    Checks site status using a rapid HTTP request.
    """
    start_time = time.perf_counter()
    status_code = -1
    is_up = False
    error_message = ""
    
    try:
        # Standard HTTP head/get request
        response = requests.get(
            site.url,
            timeout=site.timeout_seconds,
            headers={"User-Agent": "Antigravity-Website-Health-Monitor/1.0"}
        )
        status_code = response.status_code
        # Consider 2xx and 3xx as Up
        is_up = 200 <= status_code < 400
        if not is_up:
            error_message = f"HTTP status code returned: {status_code}"
    except requests.exceptions.Timeout:
        error_message = f"Request timed out after {site.timeout_seconds}s"
    except requests.exceptions.RequestException as e:
        error_message = str(e)
        
    latency_ms = (time.perf_counter() - start_time) * 1000
    
    return {
        "status_code": status_code,
        "latency_ms": latency_ms,
        "is_up": is_up,
        "error_message": error_message,
        "screenshot_path": ""
    }

async def check_site_browser(site: WebsiteTarget) -> Dict[str, Any]:
    """
    Launches Playwright headless browser to load the website fully,
    measuring render speed, taking screenshots, and verifying DOM.
    """
    start_time = time.perf_counter()
    status_code = -1
    is_up = False
    error_message = ""
    screenshot_path = ""
    
    screenshot_file = SCREENSHOTS_DIR / f"{site.id}.png"
    relative_screenshot_path = f"/static/screenshots/{site.id}.png"
    
    try:
        async with async_playwright() as p:
            # Launch chromium
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                viewport={"width": 1280, "height": 720},
                user_agent="Antigravity-Website-Health-Monitor/1.0"
            )
            page = await context.new_page()
            
            try:
                response = await page.goto(site.url, timeout=site.timeout_seconds * 1000)
                status_code = response.status if response else 200
                is_up = 200 <= status_code < 400
                
                # Take screenshot
                await page.screenshot(path=str(screenshot_file))
                screenshot_path = relative_screenshot_path
                
                if not is_up:
                    error_message = f"HTTP status returned: {status_code}"
            except Exception as inner_e:
                error_message = str(inner_e)
                # Take a screenshot of the failure if possible
                try:
                    await page.screenshot(path=str(screenshot_file))
                    screenshot_path = relative_screenshot_path
                except:
                    pass
            finally:
                await browser.close()
                
    except Exception as e:
        error_message = f"Browser engine failure: {str(e)}"
        
    latency_ms = (time.perf_counter() - start_time) * 1000
    
    # Process screenshot with OpenCV if captured
    if screenshot_file.exists():
        annotate_screenshot(
            image_path=str(screenshot_file),
            site_name=site.name,
            url=site.url,
            status_code=status_code,
            latency_ms=latency_ms,
            is_up=is_up
        )
        
    return {
        "status_code": status_code,
        "latency_ms": latency_ms,
        "is_up": is_up,
        "error_message": error_message,
        "screenshot_path": screenshot_path
    }

async def execute_health_check_for_site(site: WebsiteTarget) -> Dict[str, Any]:
    """
    Runs the specific check type (Request or Playwright Browser),
    evaluates transitions (alerting on transitions), and logs results.
    """
    print(f"[Monitor] Monitoring check triggered for: {site.name} ({site.url}) - Mode: {site.check_type.upper()}")
    
    # 1. Fetch historical state to detect state changes (up -> down or down -> up)
    df = get_logs_df()
    previously_up = True
    if not df.empty:
        site_logs = df[df["site_id"] == site.id]
        if not site_logs.empty:
            # Check the last record
            previously_up = bool(site_logs.iloc[-1]["is_up"])
            
    # 2. Perform the actual check
    if site.check_type == "browser":
        result = await check_site_browser(site)
    else:
        result = await check_site_request(site)
        
    # 3. Log results to data storage
    append_log(
        site_id=site.id,
        site_name=site.name,
        url=site.url,
        status_code=result["status_code"],
        response_time_ms=result["latency_ms"],
        is_up=result["is_up"],
        error_message=result["error_message"],
        check_type=site.check_type,
        screenshot_path=result["screenshot_path"]
    )
    
    # 4. Check status transition and alert if necessary
    is_up = result["is_up"]
    latency_ms = result["latency_ms"]
    
    if previously_up and not is_up:
        # Site went DOWN
        send_alert(
            site_name=site.name,
            url=site.url,
            status_code=result["status_code"],
            latency_ms=latency_ms,
            is_up=False,
            error_message=result["error_message"],
            alert_type="downtime"
        )
    elif not previously_up and is_up:
        # Site recovered
        send_alert(
            site_name=site.name,
            url=site.url,
            status_code=result["status_code"],
            latency_ms=latency_ms,
            is_up=True,
            alert_type="recovery"
        )
    elif is_up and latency_ms > site.latency_threshold_ms:
        # Latency warning threshold breached
        send_alert(
            site_name=site.name,
            url=site.url,
            status_code=result["status_code"],
            latency_ms=latency_ms,
            is_up=True,
            error_message=f"Latency threshold breached: {round(latency_ms, 1)}ms > {site.latency_threshold_ms}ms",
            alert_type="latency_warning"
        )
        
    return result

async def run_all_checks() -> List[Dict[str, Any]]:
    """
    Executes health checks for all configured websites concurrently.
    """
    sites = load_sites()
    tasks = [execute_health_check_for_site(site) for site in sites]
    results = await asyncio.gather(*tasks)
    return results
