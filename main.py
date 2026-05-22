from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import json
import os
import logging
from scraper import NewsScraper
from mailer import EmailManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="News Scraper Dashboard API", version="1.0.0")

# Enable CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CONFIG_FILE = "config.json"

class SmtpConfigSchema(BaseModel):
    host: str = ""
    port: int = 587
    sender: str = ""
    password: str = ""
    use_ssl: bool = False
    subject: str = "News Scraper - Curated Daily Summary"

class AppConfigSchema(BaseModel):
    mock_email: bool = True
    active_sources: List[str] = ["Hacker News", "TechCrunch", "BBC News"]
    smtp: SmtpConfigSchema = SmtpConfigSchema()

def load_config() -> AppConfigSchema:
    """Loads configuration from config.json or returns default config."""
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                data = json.load(f)
                return AppConfigSchema(**data)
        except Exception as e:
            logger.error(f"Error loading config: {e}. Reverting to defaults.")
            
    # Default config
    return AppConfigSchema()

def save_config(config: AppConfigSchema):
    """Saves configuration to config.json."""
    try:
        with open(CONFIG_FILE, "w") as f:
            json.dump(config.model_dump(), f, indent=4)
        logger.info("Configuration saved successfully.")
    except Exception as e:
        logger.error(f"Error saving config: {e}")
        raise HTTPException(status_code=500, detail="Could not save configuration file.")

# In-memory store for last scraped articles
last_scraped_articles = []

# Schemas for requests
class SendEmailRequest(BaseModel):
    recipient: str
    custom_message: Optional[str] = ""
    articles: Optional[List[dict]] = None

@app.get("/api/config", response_model=AppConfigSchema)
async def get_config():
    """Endpoint to retrieve current configuration settings."""
    return load_config()

@app.post("/api/config")
async def update_config(config: AppConfigSchema):
    """Endpoint to update configuration settings."""
    save_config(config)
    return {"status": "success", "message": "Configuration updated successfully", "config": config}

@app.get("/api/scrape")
async def scrape_news(sources: Optional[str] = None, limit: int = 10):
    """
    Endpoint to trigger a fresh scrape.
    Accepts comma-separated 'sources' parameter (e.g. ?sources=TechCrunch,BBC News).
    If 'sources' is omitted, uses sources specified in active_sources config.
    """
    global last_scraped_articles
    
    config = load_config()
    selected_sources = config.active_sources
    
    if sources:
        selected_sources = [s.strip() for s in sources.split(",") if s.strip()]
        
    if not selected_sources:
        return {"status": "error", "message": "No active scraping sources enabled."}
        
    try:
        articles = NewsScraper.scrape_all(sources=selected_sources, limit_per_source=limit)
        # Store in memory for immediate access
        last_scraped_articles = articles
        return {
            "status": "success",
            "source_count": len(selected_sources),
            "article_count": len(articles),
            "articles": articles
        }
    except Exception as e:
        logger.error(f"Scraping endpoint failed: {e}")
        raise HTTPException(status_code=500, detail=f"Scraping process failed: {str(e)}")

@app.post("/api/email")
async def send_summary_email(payload: SendEmailRequest):
    """
    Endpoint to compile and send the newsletter email summary.
    If no articles are provided in payload, it uses the last scraped articles or runs a fresh scrape.
    """
    config = load_config()
    
    # Determine which articles to send
    articles_to_send = payload.articles
    if not articles_to_send:
        # If in-memory is empty, trigger a quick fresh scrape
        if last_scraped_articles:
            articles_to_send = last_scraped_articles
        else:
            logger.info("In-memory articles empty, triggering fresh scrape for email...")
            articles_to_send = NewsScraper.scrape_all(sources=config.active_sources, limit_per_source=8)
            
    if not articles_to_send:
        raise HTTPException(status_code=400, detail="No articles found to send in summary. Please scrape first.")

    smtp_dict = config.smtp.model_dump()
    result = EmailManager.send_email(
        recipient=payload.recipient,
        articles=articles_to_send,
        smtp_config=smtp_dict,
        custom_message=payload.custom_message,
        mock=config.mock_email
    )
    
    if not result.get("success", False):
        raise HTTPException(status_code=500, detail=f"Email delivery failed: {result.get('error')}")
        
    return {
        "status": "success",
        "mode": result["mode"],
        "recipient": result["recipient"],
        "article_count": result["article_count"],
        "html_preview": result["html_preview"]
    }

# Create static folder directory if it doesn't exist
os.makedirs("static", exist_ok=True)

# Mount the static files server
app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    # Initialize default configuration file if not exists
    if not os.path.exists(CONFIG_FILE):
        save_config(AppConfigSchema())
        
    logger.info("Starting FastAPI Server...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
