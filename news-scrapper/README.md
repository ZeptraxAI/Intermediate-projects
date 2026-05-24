# 📰 NewsPulse — News Scraper Dashboard

A beautiful, modern **News Scraper Dashboard** built with **FastAPI** and a premium **Light Glassmorphic UI**. Scrapes real-time headlines from Hacker News, TechCrunch, and BBC News, and delivers them as styled newsletter digests via email.

---

## ✨ Features

- 🔍 **Multi-Source Scraping** — Live headlines from Hacker News, TechCrunch RSS, and BBC World News RSS
- 📧 **Newsletter Digest** — Compiles scraped articles into a professional HTML email template
- 🎨 **Premium Light UI** — Glassmorphism, ambient gradients, hover animations, and custom toasts
- ⚙️ **Configurable SMTP** — Toggle between mock mode (sandbox preview) and real SMTP delivery
- 🔎 **Search & Filter** — Instantly search and filter articles by source or keyword

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/Aditya0611/news-scrapper.git
cd news-scrapper
```

### 2. Create and Activate Virtual Environment
```bash
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Server
```bash
python main.py
```

### 5. Open the Dashboard
Navigate to **`http://localhost:8000`** in your browser.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend API | FastAPI + Uvicorn |
| Scraping Engine | BeautifulSoup4 + Requests |
| Data Validation | Pydantic v2 |
| Frontend UI | HTML5, Vanilla CSS (Glassmorphism), Vanilla JS |
| Email Delivery | Python smtplib (STARTTLS / SSL) |
| Typography | Plus Jakarta Sans + JetBrains Mono |
| Icons | Lucide Icons |

---

## 📂 Project Structure

```
news-scrapper/
├── main.py            # FastAPI server, API endpoints, config management
├── scraper.py         # NewsScraper — Hacker News, TechCrunch, BBC parsers
├── mailer.py          # EmailManager — HTML newsletter compiler + SMTP sender
├── config.json        # App configuration (sources, SMTP, mock mode)
├── requirements.txt   # Python dependencies
└── static/
    ├── index.html     # Single-page dashboard UI
    ├── styles.css     # Premium light glassmorphic stylesheet
    └── app.js         # Client-side controller & API bindings
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/config` | Retrieve current app configuration |
| `POST` | `/api/config` | Save updated app configuration |
| `GET` | `/api/scrape` | Trigger scraping from active sources |
| `POST` | `/api/email` | Compile and dispatch newsletter email |

---

## 📬 Email Configuration

In the **Settings** tab on the dashboard:
- Toggle **Mock Mode** to preview newsletters locally without sending
- Enter your **SMTP credentials** to enable real email delivery (supports Gmail, Outlook, etc.)

---

## 📸 Scraping Sources

| Source | Method |
|---|---|
| 🟠 Hacker News | HTML parsing via BeautifulSoup |
| 🟢 TechCrunch | RSS Feed (HTML fallback) |
| 🔴 BBC News | World News RSS Feed |

---

## 📄 License

MIT License — feel free to use, modify, and distribute.
