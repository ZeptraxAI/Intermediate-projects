import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import os
import json
from datetime import datetime
import backend.database as db

VERCEL = os.environ.get("VERCEL", "0") == "1"

if VERCEL:
    CONFIG_PATH = "/tmp/config.json"
    LOG_DIR = "/tmp/logs"
else:
    CONFIG_PATH = os.path.join(os.path.dirname(__file__), "config.json")
    LOG_DIR = os.path.join(os.path.dirname(__file__), "..", "logs")

# Ensure logs folder exists
os.makedirs(LOG_DIR, exist_ok=True)
ALERT_LOG_PATH = os.path.join(LOG_DIR, "alerts.log")

def get_email_config():
    """Loads email SMTP credentials from config file if configured."""
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "smtp_server": "smtp.gmail.com",
        "smtp_port": 587,
        "sender_email": "",
        "sender_password": "",  # App Password
        "enabled": False
    }

def save_email_config(smtp_server, smtp_port, sender_email, sender_password, enabled):
    """Saves email SMTP configuration."""
    config = {
        "smtp_server": smtp_server,
        "smtp_port": int(smtp_port),
        "sender_email": sender_email,
        "sender_password": sender_password,
        "enabled": bool(enabled)
    }
    with open(CONFIG_PATH, "w") as f:
        json.dump(config, f, indent=4)
    return config

def send_email(to_email, subject, html_content):
    """Attempts to send a real email using SMTP, fallback to local log."""
    config = get_email_config()
    
    if not config["enabled"] or not config["sender_email"] or not config["sender_password"]:
        log_alert_offline(to_email, subject, html_content)
        return False, "Offline Mode: Alert written to local log file."
        
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = config["sender_email"]
        msg["To"] = to_email
        
        part = MIMEText(html_content, "html")
        msg.attach(part)
        
        server = smtplib.SMTP(config["smtp_server"], config["smtp_port"])
        server.starttls()
        server.login(config["sender_email"], config["sender_password"])
        server.sendmail(config["sender_email"], to_email, msg.as_string())
        server.quit()
        
        # Log successful email dispatch
        with open(ALERT_LOG_PATH, "a", encoding="utf-8") as f:
            f.write(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Email alert successfully sent to {to_email}: {subject}\n")
        return True, "Email alert sent successfully."
    except Exception as e:
        error_msg = f"Failed to send email via SMTP: {str(e)}"
        print(error_msg)
        # Fallback to local logging
        log_alert_offline(to_email, subject, html_content, error_prefix=error_msg)
        return False, f"SMTP Error: {str(e)}. Alert saved to local log."

def log_alert_offline(to_email, subject, html_content, error_prefix=None):
    """Writes alert to local files so user can see it works without actual email SMTP credentials."""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    # 1. Log to alerts.log (text format)
    log_entry = f"[{timestamp}] ALERT TRIGGERED for {to_email}\nSubject: {subject}\n"
    if error_prefix:
        log_entry += f"Reason for Offline Fallback: {error_prefix}\n"
    log_entry += "--------------------------------------------------\n"
    
    with open(ALERT_LOG_PATH, "a", encoding="utf-8") as f:
        f.write(log_entry)
        
    # 2. Log to alerts_preview.html (visual dashboard sandbox)
    html_preview_path = os.path.join(LOG_DIR, "alerts_preview.html")
    
    preview_box = f"""
    <div style="border: 2px solid #5a5be2; border-radius: 12px; margin: 20px 0; font-family: 'Segoe UI', sans-serif; background-color: #121324; color: #fff; box-shadow: 0 4px 15px rgba(0,0,0,0.5); overflow: hidden;">
        <div style="background-color: #5a5be2; padding: 12px 20px; font-weight: bold; display: flex; justify-content: space-between;">
            <span>Notification Preview (Offline Mode)</span>
            <span style="font-size: 0.85em; opacity: 0.8;">{timestamp}</span>
        </div>
        <div style="padding: 10px 20px; font-size: 0.9em; border-bottom: 1px solid #222336; background: #17182c;">
            <strong>To:</strong> {to_email}<br>
            <strong>Subject:</strong> {subject}
        </div>
        <div style="padding: 20px;">
            {html_content}
        </div>
    </div>
    """
    
    # Read existing content if it exists, insert at the top
    existing_content = ""
    if os.path.exists(html_preview_path):
        with open(html_preview_path, "r", encoding="utf-8") as f:
            existing_content = f.read()
            # extract body if already a formatted page, or just keep it simple
            
    if not existing_content:
        # Initial template
        existing_content = """<!DOCTYPE html>
<html>
<head>
    <title>E-Commerce Price Tracker - Alert Box Logs</title>
    <meta charset="utf-8">
</head>
<body style="background-color: #0b0c16; padding: 20px; max-width: 800px; margin: 0 auto;">
    <h1 style="color: #fff; font-family: sans-serif; text-align: center; border-bottom: 1px solid #333; padding-bottom: 10px;">Alerts Log Preview</h1>
</body>
</html>"""
        
    # Insert new alert inside the body
    insertion_marker = "</h1>"
    idx = existing_content.find(insertion_marker)
    if idx != -1:
        insert_point = idx + len(insertion_marker)
        updated_content = existing_content[:insert_point] + preview_box + existing_content[insert_point:]
    else:
        updated_content = existing_content + preview_box
        
    with open(html_preview_path, "w", encoding="utf-8") as f:
        f.write(updated_content)

def check_and_trigger_alerts():
    """Queries all active alerts, checks current price thresholds, and sends notifications."""
    active_alerts = db.get_alerts(only_active=True)
    triggered_count = 0
    
    for alert in active_alerts:
        current_price = alert["current_price"]
        target_price = alert["target_price"]
        
        # Check if price dropped below or equal to target
        if current_price <= target_price:
            product_title = alert["product_title"]
            product_url = alert["product_url"]
            email = alert["email"]
            image_url = alert["image_url"] or "https://via.placeholder.com/150?text=Product+Image"
            
            # Formulate visual HTML email template
            saving = target_price - current_price
            saving_pct = round((saving / target_price) * 100, 1) if target_price > 0 else 0
            
            html_template = f"""
            <div style="background-color: #0b0c16; color: #ffffff; padding: 30px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; border-radius: 16px; margin: auto; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4); border: 1px solid #232545;">
                <div style="text-align: center; border-bottom: 1px solid #232545; padding-bottom: 20px;">
                    <span style="font-size: 28px;">🛒</span>
                    <h2 style="margin: 10px 0 0 0; color: #7f56d9; font-weight: 700; letter-spacing: -0.5px;">Price Alert Triggered!</h2>
                </div>
                <div style="padding: 20px 0; text-align: center;">
                    <img src="{image_url}" alt="{product_title}" style="max-width: 180px; border-radius: 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); background-color: #fff; padding: 5px;" />
                    <h3 style="color: #ffffff; margin-top: 15px; font-size: 18px; font-weight: 600; text-align: left; line-height: 1.4;">{product_title}</h3>
                </div>
                <div style="background-color: #121324; border-radius: 12px; padding: 15px 20px; margin: 10px 0 20px 0; border: 1px solid #1c1d38;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="color: #94a3b8; padding: 6px 0;">Alert Price:</td>
                            <td style="text-align: right; font-weight: bold; color: #f43f5e; padding: 6px 0;">₹{target_price:,.2f}</td>
                        </tr>
                        <tr>
                            <td style="color: #94a3b8; padding: 6px 0;">Current Price:</td>
                            <td style="text-align: right; font-weight: bold; color: #10b981; font-size: 1.2em; padding: 6px 0;">₹{current_price:,.2f}</td>
                        </tr>
                        <tr style="border-top: 1px solid #1c1d38;">
                            <td style="color: #10b981; padding: 8px 0; font-weight: 600;">You Save:</td>
                            <td style="text-align: right; font-weight: bold; color: #10b981; padding: 8px 0;">₹{saving:,.2f} ({saving_pct}%)</td>
                        </tr>
                    </table>
                </div>
                <div style="text-align: center; margin-top: 25px;">
                    <a href="{product_url}" style="background-color: #7f56d9; color: #ffffff; text-decoration: none; padding: 12px 30px; font-weight: 600; border-radius: 8px; display: inline-block; box-shadow: 0 4px 12px rgba(127, 86, 217, 0.4); transition: background-color 0.2s;">
                        Buy Now on {alert['store']}
                    </a>
                </div>
                <div style="text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #232545; font-size: 11px; color: #64748b;">
                    This price alert was sent automatically by E-Commerce Price Tracker & Alert System.
                </div>
            </div>
            """
            
            subject = f"🚨 Deal Alert: {product_title[:30]}... dropped to ₹{current_price:,.0f}!"
            send_email(email, subject, html_template)
            
            # Mark the alert as triggered (inactive) in database
            db.trigger_alert(alert["id"])
            triggered_count += 1
            
    return triggered_count
