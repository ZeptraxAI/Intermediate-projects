# 🛒 E-Commerce Price Tracker & Alert System

A premium, fully automated price tracking web application with machine learning-based price drop predictions and customizable threshold email alert notifications.

---

## Key Features

1. **Dual Scraper Engine**: 
   - **Real Scraper**: Scrapes live product names, prices, images, and ratings directly from Amazon & Flipkart using requests and BS4.
   - **Mock Generator**: Toggles a mock feed with 30-90 days of high-fidelity price history and dynamic daily fluctuations. Perfect for presenting predictions, charts, and alert flows instantly without waiting for weeks of tracking.
2. **Machine Learning Price Forecasting**:
   - Integrates Pandas, NumPy, and **Scikit-learn** linear regression to build a 7-day future price prediction.
   - Computes standard price volatility scales and estimates price-drop probability metrics.
3. **Automated Alert System**:
   - Dispatches beautifully formatted HTML deals emails when current prices drop below configured user thresholds.
   - Integrates with actual Gmail/SMTP credentials.
   - Fallback logs write directly to the local file `logs/alerts_preview.html` if SMTP is not configured, which can be viewed directly in the web dashboard!
4. **Excel Export Builder**:
   - Builds custom formatted `.xlsx` reports detailing products summary and raw history trends using `openpyxl`.
5. **Vibrant Glassmorphic Interface**:
   - Pure HTML, responsive CSS, and dynamic JS layout with interactive Chart.js widgets.
   - Dark mode default with vibrant neon color indices.

---

## Tech Stack
- **Backend API**: FastAPI, Uvicorn, Python 3.10+
- **Data Engineering**: Pandas, NumPy, Scikit-learn
- **Workbook Builder**: OpenPyXL
- **HTML Parsing**: BeautifulSoup4, Requests
- **Frontend Dashboard**: HTML5, Vanilla CSS3, Javascript (ES6), Chart.js

---

## How to Install and Run

1. Open the project root folder: `c:\Users\rajni\OneDrive\Desktop\E commerce`.
2. Double-click the launcher script: **`run.bat`**
   - *This will automatically set up the Python virtual environment (`venv`), install dependencies from `backend/requirements.txt`, initialize the SQLite database, pre-load sample products, and start the local FastAPI web server.*
3. Open your browser and navigate to: **`http://localhost:8000`**

---

## User Control Guide

- **Dashboard**: Browse the tracked products catalog, inspect rating metrics, review current discounts, and trigger manual updates.
- **Price Insights**: Inspect historical prices plotted side-by-side with 7-day predictive models, check volatility ratings, and review buy strategies.
- **Alert Center**: Set a trigger threshold and register active email alerts on any catalog product.
- **Control Panel**:
  - Save your SMTP details to test live email sends.
  - Flush database caches or wipe logs.
  - Read simulated email notification boxes inside the **Simulated Mailbox** scrollbox.
