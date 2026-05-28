import time
import threading
import schedule
import random
import backend.database as db
import backend.scraper as scraper
import backend.alerts as alerts

_scheduler_thread = None
_stop_event = threading.Event()
_is_running = False

def run_scrape_cycle():
    """
    Sequentially scrapes all products in the database,
    updates their prices, and checks for price drop alerts.
    """
    print("[Scheduler] Starting price checking cycle...")
    products = db.get_products()
    
    scraped_count = 0
    for product in products:
        try:
            print(f"[Scheduler] Scraped {product['title']} (URL: {product['url']})...")
            # In a daily schedule, we pull fresh data. If block occurs, scraper falls back to mock.
            scraped_data = scraper.scrape_product(product["url"], current_price=product["current_price"])
            if scraped_data:
                db.update_product_price(product["id"], scraped_data["price"])
                scraped_count += 1
            # Add small random sleep between actual requests to avoid IP bans
            time.sleep(random.uniform(1.0, 3.0) if "mock" not in product["url"].lower() else 0.1)
        except Exception as e:
            print(f"[Scheduler] Error scraping product {product['id']}: {e}")
            
    print(f"[Scheduler] Price check cycle finished. Scraped {scraped_count} products.")
    
    # Process alerts
    try:
        triggered = alerts.check_and_trigger_alerts()
        if triggered > 0:
            print(f"[Scheduler] Triggered {triggered} price alerts.")
    except Exception as e:
        print(f"[Scheduler] Error checking alerts: {e}")

def _scheduler_loop():
    # Schedule target: run daily at 08:00 AM
    schedule.every().day.at("08:00").do(run_scrape_cycle)
    
    # Also add a general heartbeat every 4 hours to confirm scheduler is alive
    # schedule.every(4).hours.do(lambda: print("[Scheduler] Alive and waiting..."))
    
    print("[Scheduler] Background loop started successfully.")
    
    while not _stop_event.is_set():
        schedule.run_pending()
        # Sleep short intervals to allow quick exit when stop_event is set
        time.sleep(1)

def start_scheduler():
    global _scheduler_thread, _is_running
    if _is_running:
        print("[Scheduler] Already running.")
        return
        
    _stop_event.clear()
    _scheduler_thread = threading.Thread(target=_scheduler_loop, daemon=True)
    _scheduler_thread.start()
    _is_running = True
    print("[Scheduler] Thread spawned.")

def stop_scheduler():
    global _is_running
    if not _is_running:
        return
        
    print("[Scheduler] Stopping background thread...")
    _stop_event.set()
    if _scheduler_thread:
        _scheduler_thread.join(timeout=3)
    _is_running = False
    print("[Scheduler] Thread stopped.")
