import sqlite3
import os
import shutil
from datetime import datetime

VERCEL = os.environ.get("VERCEL", "0") == "1"

if VERCEL:
    DB_PATH = "/tmp/tracker.db"
else:
    DB_PATH = os.path.join(os.path.dirname(__file__), "tracker.db")

def get_db_connection():
    if VERCEL and not os.path.exists(DB_PATH):
        src_path = os.path.join(os.path.dirname(__file__), "tracker.db")
        if os.path.exists(src_path):
            try:
                # Ensure /tmp directory structure is ready (though /tmp is always present)
                os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
                shutil.copy2(src_path, DB_PATH)
                print(f"[DB] Successfully copied pre-seeded database to {DB_PATH}")
            except Exception as e:
                print(f"[DB] Error copying database: {e}")
                
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create products table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        url TEXT UNIQUE NOT NULL,
        store TEXT NOT NULL,
        image_url TEXT,
        rating REAL,
        current_price REAL,
        target_price REAL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # Create price_history table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS price_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        price REAL NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
    )
    """)
    
    # Create alerts table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        email TEXT NOT NULL,
        target_price REAL NOT NULL,
        is_active INTEGER DEFAULT 1,
        is_triggered INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
    )
    """)
    
    conn.commit()
    conn.close()

def add_product(title, url, store, image_url, rating, current_price, target_price=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
        INSERT INTO products (title, url, store, image_url, rating, current_price, target_price)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (title, url, store, image_url, rating, current_price, target_price))
        product_id = cursor.lastrowid
        
        # Insert initial price history
        cursor.execute("""
        INSERT INTO price_history (product_id, price)
        VALUES (?, ?)
        """, (product_id, current_price))
        
        conn.commit()
        return product_id
    except sqlite3.IntegrityError:
        # Product already exists, let's fetch it
        cursor.execute("SELECT id FROM products WHERE url = ?", (url,))
        row = cursor.fetchone()
        return row[0] if row else None
    finally:
        conn.close()

def update_product_price(product_id, price):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE products
    SET current_price = ?
    WHERE id = ?
    """, (price, product_id))
    
    cursor.execute("""
    INSERT INTO price_history (product_id, price)
    VALUES (?, ?)
    """, (product_id, price))
    
    conn.commit()
    conn.close()

def add_price_history(product_id, price, timestamp=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if timestamp:
        cursor.execute("""
        INSERT INTO price_history (product_id, price, timestamp)
        VALUES (?, ?, ?)
        """, (product_id, price, timestamp))
    else:
        cursor.execute("""
        INSERT INTO price_history (product_id, price)
        VALUES (?, ?)
        """, (product_id, price))
    conn.commit()
    conn.close()

def get_products():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_product(product_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def delete_product(product_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM products WHERE id = ?", (product_id,))
    conn.commit()
    conn.close()

def get_price_history(product_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT price, timestamp FROM price_history 
    WHERE product_id = ? 
    ORDER BY timestamp ASC
    """, (product_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def add_alert(product_id, email, target_price):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO alerts (product_id, email, target_price)
    VALUES (?, ?, ?)
    """, (product_id, email, target_price))
    alert_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return alert_id

def get_alerts(only_active=True):
    conn = get_db_connection()
    cursor = conn.cursor()
    if only_active:
        cursor.execute("""
        SELECT a.*, p.title as product_title, p.current_price, p.url as product_url, p.image_url 
        FROM alerts a 
        JOIN products p ON a.product_id = p.id 
        WHERE a.is_active = 1
        """)
    else:
        cursor.execute("""
        SELECT a.*, p.title as product_title, p.current_price, p.url as product_url, p.image_url 
        FROM alerts a 
        JOIN products p ON a.product_id = p.id
        """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def trigger_alert(alert_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE alerts
    SET is_active = 0, is_triggered = 1
    WHERE id = ?
    """, (alert_id,))
    conn.commit()
    conn.close()

def get_price_history_count(product_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM price_history WHERE product_id = ?", (product_id,))
    count = cursor.fetchone()[0]
    conn.close()
    return count

def get_first_price(product_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT price FROM price_history WHERE product_id = ? ORDER BY timestamp ASC LIMIT 1", (product_id,))
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else None

def clear_mock_data():
    """Helper to clear database for reset."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM price_history")
    cursor.execute("DELETE FROM alerts")
    cursor.execute("DELETE FROM products")
    conn.commit()
    conn.close()
