import requests
from bs4 import BeautifulSoup
import logging
from datetime import datetime

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
}

class NewsScraper:
    @staticmethod
    def scrape_hacker_news(limit=15):
        """Scrapes top stories from Hacker News using BeautifulSoup."""
        articles = []
        try:
            url = "https://news.ycombinator.com/"
            response = requests.get(url, headers=HEADERS, timeout=10)
            if response.status_code != 200:
                logger.error(f"Failed to fetch Hacker News: {response.status_code}")
                return []

            soup = BeautifulSoup(response.text, "html.parser")
            # HN structure: tr.athing is the story row, next tr is the subtext row
            rows = soup.select("tr.athing")
            
            for row in rows[:limit]:
                try:
                    story_id = row.get("id")
                    title_span = row.select_one(".titleline > a")
                    if not title_span:
                        # Sometimes HN has multiple links in titleline (e.g. [pdf], link)
                        title_span = row.select_one(".titleline a")
                    
                    if not title_span:
                        continue
                        
                    title = title_span.text
                    link = title_span.get("href")
                    if link and link.startswith("item?id="):
                        link = "https://news.ycombinator.com/" + link

                    # Find the subtext row
                    subtext_row = row.find_next_sibling("tr")
                    score = "0 points"
                    author = "anonymous"
                    time_str = "some time ago"

                    if subtext_row:
                        score_span = subtext_row.select_one(".score")
                        if score_span:
                            score = score_span.text

                        hnuser_a = subtext_row.select_one(".hnuser")
                        if hnuser_a:
                            author = hnuser_a.text

                        age_span = subtext_row.select_one(".age")
                        if age_span:
                            time_str = age_span.get("title") or age_span.text
                            # Format time nicely if it's an ISO timestamp
                            if "T" in time_str:
                                try:
                                    # Example: 2026-05-22T17:00:00
                                    dt = datetime.fromisoformat(time_str.replace("Z", "+00:00"))
                                    time_str = dt.strftime("%b %d, %Y %I:%M %p")
                                except Exception:
                                    pass

                    articles.append({
                        "id": f"hn-{story_id}" if story_id else f"hn-{len(articles)}",
                        "title": title,
                        "url": link,
                        "source": "Hacker News",
                        "author": author,
                        "metadata": score,
                        "timestamp": time_str,
                        "summary": f"Discussion on Hacker News. Score: {score} by {author}."
                    })
                except Exception as e:
                    logger.error(f"Error parsing Hacker News row: {e}")
                    continue

        except Exception as e:
            logger.error(f"Error scraping Hacker News: {e}")
        
        return articles

    @staticmethod
    def scrape_techcrunch(limit=15):
        """Scrapes TechCrunch headlines and summaries using RSS or HTML parsing."""
        articles = []
        try:
            # We use their RSS feed as it is highly stable, includes rich summaries, and is fully legitimate for scraping
            url = "https://techcrunch.com/feed/"
            response = requests.get(url, headers=HEADERS, timeout=10)
            if response.status_code != 200:
                # Fallback to direct HTML parsing if RSS is down
                logger.warning("TechCrunch RSS failed, attempting homepage HTML scrape...")
                return NewsScraper._scrape_techcrunch_html(limit)

            soup = BeautifulSoup(response.content, "html.parser")
            items = soup.find_all("item")
            
            for item in items[:limit]:
                title = item.find("title").text if item.find("title") else "No Title"
                link = item.find("link").text if item.find("link") else "#"
                creator = item.find("dc:creator")
                author = creator.text if creator else "TechCrunch Staff"
                
                # Extract summary and clean up HTML tags if any
                desc_elem = item.find("description")
                summary = ""
                if desc_elem:
                    desc_soup = BeautifulSoup(desc_elem.text, "html.parser")
                    summary = desc_soup.text.strip()
                    # Cap summary length
                    if len(summary) > 200:
                        summary = summary[:197] + "..."
                
                pub_date = item.find("pubDate")
                time_str = pub_date.text if pub_date else "Recently"
                if pub_date:
                    try:
                        # Mon, 22 May 2026 17:00:00 +0000
                        dt = datetime.strptime(time_str[:25].strip(), "%a, %d %b %Y %H:%M:%S")
                        time_str = dt.strftime("%b %d, %Y %I:%M %p")
                    except Exception:
                        pass

                articles.append({
                    "id": f"tc-{hash(link)}",
                    "title": title.strip(),
                    "url": link.strip(),
                    "source": "TechCrunch",
                    "author": author.strip(),
                    "metadata": "Tech News",
                    "timestamp": time_str,
                    "summary": summary or "Click to read the full startup and technology story on TechCrunch."
                })
        except Exception as e:
            logger.error(f"Error scraping TechCrunch RSS: {e}")
            # Try HTML fallback
            return NewsScraper._scrape_techcrunch_html(limit)
            
        return articles

    @staticmethod
    def _scrape_techcrunch_html(limit=15):
        """Fallback HTML scraper for TechCrunch."""
        articles = []
        try:
            url = "https://techcrunch.com/"
            response = requests.get(url, headers=HEADERS, timeout=10)
            if response.status_code != 200:
                return []
            
            soup = BeautifulSoup(response.text, "html.parser")
            # Look for article links
            # TechCrunch often uses elements like h2/h3 inside loop or wp-block-post-title
            blocks = soup.select("h2.wp-block-post-title a, h3.loop-card__title a, a.post-block__title__link")
            
            for i, link_tag in enumerate(blocks[:limit]):
                title = link_tag.text.strip()
                link = link_tag.get("href")
                articles.append({
                    "id": f"tc-html-{i}",
                    "title": title,
                    "url": link,
                    "source": "TechCrunch",
                    "author": "TechCrunch Writer",
                    "metadata": "Tech & Startups",
                    "timestamp": "Recently",
                    "summary": "Live technology and startup news from TechCrunch homepage."
                })
        except Exception as e:
            logger.error(f"Error scraping TechCrunch HTML: {e}")
        return articles

    @staticmethod
    def scrape_bbc_news(limit=15):
        """Scrapes World News headlines and summaries from BBC News RSS."""
        articles = []
        try:
            # We use their stable World News RSS feed
            url = "https://feeds.bbci.co.uk/news/world/rss.xml"
            response = requests.get(url, headers=HEADERS, timeout=10)
            if response.status_code != 200:
                logger.error(f"Failed to fetch BBC News RSS: {response.status_code}")
                return []

            soup = BeautifulSoup(response.content, "html.parser")
            items = soup.find_all("item")
            
            for item in items[:limit]:
                title = item.find("title").text if item.find("title") else "No Title"
                link = item.find("link").text if item.find("link") else "#"
                desc = item.find("description").text if item.find("description") else ""
                
                pub_date = item.find("pubDate")
                time_str = pub_date.text if pub_date else "Recently"
                if pub_date:
                    try:
                        # Example: Fri, 22 May 2026 17:00:00 GMT
                        dt = datetime.strptime(time_str[:25].strip(), "%a, %d %b %Y %H:%M:%S")
                        time_str = dt.strftime("%b %d, %Y %I:%M %p")
                    except Exception:
                        pass

                articles.append({
                    "id": f"bbc-{hash(link)}",
                    "title": title.strip(),
                    "url": link.strip(),
                    "source": "BBC News",
                    "author": "BBC World News",
                    "metadata": "World News",
                    "timestamp": time_str,
                    "summary": desc.strip() or "Click to read the latest global coverage and live updates on BBC News."
                })
        except Exception as e:
            logger.error(f"Error scraping BBC News RSS: {e}")
        
        return articles

    @classmethod
    def scrape_all(cls, sources=None, limit_per_source=10):
        """Scrapes all requested sources and aggregates the news articles."""
        if sources is None:
            sources = ["Hacker News", "TechCrunch", "BBC News"]
            
        all_articles = []
        
        if "Hacker News" in sources:
            logger.info("Scraping Hacker News...")
            all_articles.extend(cls.scrape_hacker_news(limit_per_source))
            
        if "TechCrunch" in sources:
            logger.info("Scraping TechCrunch...")
            all_articles.extend(cls.scrape_techcrunch(limit_per_source))
            
        if "BBC News" in sources:
            logger.info("Scraping BBC News...")
            all_articles.extend(cls.scrape_bbc_news(limit_per_source))
            
        return all_articles

if __name__ == "__main__":
    # Quick testing block
    print("Testing scrapers...")
    articles = NewsScraper.scrape_all(limit_per_source=3)
    for a in articles:
        print(f"[{a['source']}] {a['title']} - {a['url']}")
