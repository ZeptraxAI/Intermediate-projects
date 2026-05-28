import requests
from bs4 import BeautifulSoup
import re
import random
from datetime import datetime, timedelta
import urllib.parse
try:
    from playwright.sync_api import sync_playwright
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False

def fetch_html_with_playwright(url):
    """
    Launches a headless Chromium browser using Playwright, navigates to the URL,
    simulates standard human viewport and user-agent, and returns the fully rendered HTML.
    """
    if not PLAYWRIGHT_AVAILABLE:
        print("[Scraper Engine] Playwright is not installed or available. Falling back to Mock Scraper.")
        return None
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            ua = random.choice(USER_AGENTS)
            context = browser.new_context(
                user_agent=ua,
                viewport={"width": 1280, "height": 800},
                locale="en-US"
            )
            page = context.new_page()
            
            # Navigate using a 20-second timeout, waiting for initial DOM load
            page.goto(url, wait_until="domcontentloaded", timeout=20000)
            
            # Artificial human delay
            page.wait_for_timeout(random.randint(1500, 2500))
            
            # Scroll down to trigger lazy loading of assets
            page.evaluate("window.scrollTo(0, 500)")
            page.wait_for_timeout(500)
            
            html = page.content()
            browser.close()
            return html
    except Exception as e:
        print(f"[Scraper Engine] Playwright fetch failed for {url}: {e}")
        return None

# List of common User-Agents to bypass basic blocks
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/119.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36"
]

def clean_price(price_str):
    if not price_str:
        return None
    # Remove currency symbols, commas, and whitespace
    clean_str = re.sub(r"[^\d.]", "", price_str)
    try:
        return float(clean_str)
    except ValueError:
        return None

def scrape_amazon(url):
    try:
        html = fetch_html_with_playwright(url)
        if not html:
            return None
        
        soup = BeautifulSoup(html, "html.parser")
        
        # Extract title
        title_elem = soup.find("span", {"id": "productTitle"})
        title = title_elem.text.strip() if title_elem else None
        
        # Extract price
        price = None
        # Try different Amazon price selectors
        price_selectors = [
            ("span", {"class": "a-price-whole"}),
            ("span", {"class": "a-offscreen"}),
            ("span", {"id": "priceblock_ourprice"}),
            ("span", {"id": "priceblock_dealprice"}),
        ]
        
        for tag, attrs in price_selectors:
            price_elem = soup.find(tag, attrs)
            if price_elem:
                price = clean_price(price_elem.text)
                if price:
                    break
        
        # Extract image URL
        image_url = None
        img_elem = soup.find("img", {"id": "landingImage"})
        if img_elem and "data-a-dynamic-image" in img_elem.attrs:
            # Parse dynamic image dict
            try:
                img_dict = eval(img_elem.attrs["data-a-dynamic-image"])
                image_url = list(img_dict.keys())[0]
            except Exception:
                image_url = img_elem.attrs.get("src")
        elif img_elem:
            image_url = img_elem.attrs.get("src")
            
        # Extract rating
        rating = None
        rating_elem = soup.find("span", {"class": "a-icon-alt"})
        if rating_elem:
            rating_match = re.search(r"(\d+\.?\d*)\s+out of", rating_elem.text)
            if rating_match:
                rating = float(rating_match.group(1))
                
        if title and price:
            return {
                "title": title,
                "price": price,
                "image_url": image_url or "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80",
                "rating": rating or 4.0,
                "store": "Amazon"
            }
    except Exception as e:
        print(f"Error scraping Amazon: {e}")
        
    return None

def scrape_flipkart(url):
    try:
        html = fetch_html_with_playwright(url)
        if not html:
            return None
            
        soup = BeautifulSoup(html, "html.parser")
        
        # Extract title
        title_elem = soup.find("span", {"class": "B_NuCI"}) or soup.find("span", {"class": "VU-ZEg"})
        title = title_elem.text.strip() if title_elem else None
        
        # Extract price
        price_elem = soup.find("div", {"class": "_30jeq3 _16Jk6d"}) or soup.find("div", {"class": "Nx9r8q"})
        price = clean_price(price_elem.text) if price_elem else None
        
        # Extract image URL
        image_url = None
        img_elem = soup.find("img", {"class": "_396cs4 _2amPTt _3qG1V6"}) or soup.find("img", {"class": "CXW8mj"}) or soup.find("img", {"class": "DByoR4"})
        if img_elem:
            image_url = img_elem.attrs.get("src")
            
        # Extract rating
        rating = None
        rating_elem = soup.find("div", {"class": "_3LWZlK"}) or soup.find("div", {"class": "XQD0A-"})
        if rating_elem:
            try:
                rating = float(rating_elem.text.strip())
            except ValueError:
                pass
                
        if title and price:
            return {
                "title": title,
                "price": price,
                "image_url": image_url or "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80",
                "rating": rating or 4.0,
                "store": "Flipkart"
            }
    except Exception as e:
        print(f"Error scraping Flipkart: {e}")
        
    return None

def generate_mock_product(url, current_price=None):
    """
    Generates a realistic mock product based on keywords in the URL.
    This acts as a reliable fallback for offline mode or when scraping is blocked.
    """
    decoded_url = urllib.parse.unquote(url.lower())
    
    # Check for keywords to generate a specific product
    if "iphone" in decoded_url:
        title = "Apple iPhone 15 Pro (128 GB) - Blue Titanium"
        base_price = 129900.00
        image_url = "https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=600&q=80"
        rating = 4.7
        store = "Amazon" if "amazon" in decoded_url else "Flipkart"
    elif "samsung" in decoded_url or "galaxy" in decoded_url:
        title = "Samsung Galaxy S24 Ultra 5G (Titanium Gray, 12GB RAM, 256GB Storage)"
        base_price = 119999.00
        image_url = "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=600&q=80"
        rating = 4.6
        store = "Flipkart" if "flipkart" in decoded_url else "Amazon"
    elif "kindle" in decoded_url:
        title = "All-new Kindle Paperwhite (16 GB) - 6.8\" display and adjustable warm light"
        base_price = 14999.00
        image_url = "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80"
        rating = 4.5
        store = "Amazon"
    elif "jbl" in decoded_url or "tune" in decoded_url:
        title = "JBL Tune 510BT Wireless On-Ear Headphones (Black)"
        base_price = 3499.00
        image_url = "https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=600&q=80"
        rating = 4.3
        store = "Amazon" if "amazon" in decoded_url else "Flipkart"
    elif "sony" in decoded_url or "wh-1000xm5" in decoded_url or "headphone" in decoded_url:
        title = "Sony WH-1000XM5 Wireless Industry Leading Active Noise Cancelling Headphones"
        base_price = 29990.00
        image_url = "https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=600&q=80"
        rating = 4.5
        store = "Amazon"
    elif "macbook" in decoded_url:
        title = "Apple MacBook Air Laptop with M3 chip: 13.6-inch Liquid Retina Display"
        base_price = 114900.00
        image_url = "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80"
        rating = 4.8
        store = "Amazon"
    else:
        # Generic Product fallback
        stores = ["Amazon", "Flipkart"]
        store = "Amazon"
        for s in stores:
            if s.lower() in decoded_url:
                store = s
                break
                
        title = "Premium Smart Gadget 5G (Midnight Black)"
        base_price = float(random.randint(10, 80) * 500 - 1)  # e.g. 4999, 14999, etc.
        image_url = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80"
        rating = round(random.uniform(3.8, 4.9), 1)
        
    # Simulate a realistic price fluctuation around the current price if available,
    # otherwise fallback to the base price
    if current_price is not None:
        # Organic minor price change (-2% to +1.5%) to simulate realistic tracker activity
        change_pct = random.uniform(-0.02, 0.015)
        price = round(current_price * (1 + change_pct), 2)
    else:
        price = base_price
        
    return {
        "title": title,
        "price": price,
        "image_url": image_url,
        "rating": rating,
        "store": store
    }

def generate_price_history(initial_price, days=30):
    """
    Generates a realistic historical price curve over `days` days.
    Simulates weekend sales, discount periods, and a general random walk with a downward trend.
    """
    history = []
    current_price = initial_price * 1.15  # start slightly higher in history
    
    # We will compute timestamps in reverse from today
    today = datetime.now()
    
    for i in range(days, -1, -1):
        date = today - timedelta(days=i)
        
        # 1. Random daily fluctuation (up to +-2%)
        change_pct = random.uniform(-0.02, 0.018)  # slight downward bias
        current_price = current_price * (1 + change_pct)
        
        # 2. Weekend Sale (5% chance on Fridays/Saturdays)
        if date.strftime('%a') in ['Fri', 'Sat'] and random.random() < 0.15:
            current_price = current_price * 0.92  # 8% discount
            
        # 3. Holiday Flash Sale (sudden drop and quick recovery)
        if i in [15, 45, 75] and random.random() < 0.5:
            current_price = current_price * 0.85  # 15% drop
            
        # Ensure price doesn't drop to zero
        current_price = max(current_price, initial_price * 0.5)
        
        history.append({
            "price": round(current_price, 2),
            "timestamp": date.strftime("%Y-%m-%d %H:%M:%S")
        })
        
    # Set the final price to match the target initial_price
    history[-1]["price"] = initial_price
    return history

def scrape_product(url, current_price=None, force_mock=False):
    """
    Main scraping controller.
    Attempts to scrape actual web content, falling back to mock generation on error or block.
    """
    if force_mock:
        return generate_mock_product(url, current_price)
        
    result = None
    if "amazon" in url.lower():
        result = scrape_amazon(url)
    elif "flipkart" in url.lower():
        result = scrape_flipkart(url)
        
    if result:
        return result
        
    # If scraping failed, use the mock generator
    print(f"Scraping failed or URL not supported. Falling back to Mock Engine for: {url}")
    return generate_mock_product(url, current_price)
