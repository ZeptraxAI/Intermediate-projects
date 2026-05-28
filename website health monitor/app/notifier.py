import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime
from app.config import load_settings, DATA_DIR

ALERTS_LOG = DATA_DIR / "email_alerts.log"

def log_email_alert_locally(subject: str, html_content: str):
    """
    Fallback method to write SMTP email alerts to a local log file for testing and verification
    without requiring active SMTP credentials.
    """
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    divider = "=" * 80
    log_entry = f"{divider}\n[{timestamp}] EMAIL ALERT SENT\nSubject: {subject}\n{divider}\n{html_content}\n\n"
    
    try:
        with open(ALERTS_LOG, "a", encoding="utf-8") as f:
            f.write(log_entry)
        print(f"[Email Alert] logged locally to: {ALERTS_LOG}")
    except Exception as e:
        print(f"Error logging email locally: {e}")

def send_alert(
    site_name: str,
    url: str,
    status_code: int,
    latency_ms: float,
    is_up: bool,
    error_message: str = "",
    alert_type: str = "downtime"  # "downtime", "recovery", "latency_warning"
):
    """
    Sends a beautifully formatted HTML email alert when a site goes down, recovers,
    or has highly degraded latency. Falls back to local logging if SMTP is not enabled.
    """
    settings = load_settings()
    
    # 1. Determine Subject and Theme Color
    if alert_type == "downtime":
        subject = f"🚨 ALERT: {site_name} is DOWN!"
        theme_color = "#E11D48"  # Slate rose red
        status_text = "DOWN / OFFLINE"
    elif alert_type == "recovery":
        subject = f"✅ RECOVERY: {site_name} is back ONLINE!"
        theme_color = "#10B981"  # Emerald green
        status_text = "ONLINE / HEALTHY"
    else:
        subject = f"⚠️ WARNING: {site_name} is experiencing HIGH LATENCY!"
        theme_color = "#F59E0B"  # Amber orange
        status_text = "DEGRADED PERFORMANCE"

    # 2. Build HTML Body
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    error_row = f"""
    <tr>
        <td style="padding: 10px; border: 1px solid #E2E8F0; font-weight: bold; background-color: #F8FAFC;">Error Details</td>
        <td style="padding: 10px; border: 1px solid #E2E8F0; color: #E11D48;">{error_message}</td>
    </tr>
    """ if error_message else ""

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>{subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06); border: 1px solid #E2E8F0;">
            <!-- Header Banner -->
            <div style="background-color: {theme_color}; padding: 24px; text-align: center; color: #FFFFFF;">
                <h1 style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: -0.5px;">{subject}</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 30px;">
                <p style="margin-top: 0; color: #475569; font-size: 16px; line-height: 1.5;">
                    The automated health monitor has detected a state change for <strong>{site_name}</strong>. Details of the event are logged below:
                </p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 15px; text-align: left;">
                    <tbody>
                        <tr>
                            <td style="width: 35%; padding: 10px; border: 1px solid #E2E8F0; font-weight: bold; background-color: #F8FAFC;">Site Name</td>
                            <td style="padding: 10px; border: 1px solid #E2E8F0; color: #1E293B;">{site_name}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #E2E8F0; font-weight: bold; background-color: #F8FAFC;">URL</td>
                            <td style="padding: 10px; border: 1px solid #E2E8F0; color: #2563EB;"><a href="{url}" style="color: #2563EB; text-decoration: none;">{url}</a></td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #E2E8F0; font-weight: bold; background-color: #F8FAFC;">Current Status</td>
                            <td style="padding: 10px; border: 1px solid #E2E8F0; font-weight: bold; color: {theme_color};">{status_text}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #E2E8F0; font-weight: bold; background-color: #F8FAFC;">HTTP Status Code</td>
                            <td style="padding: 10px; border: 1px solid #E2E8F0; color: #1E293B;">{status_code if status_code > 0 else 'N/A'}</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #E2E8F0; font-weight: bold; background-color: #F8FAFC;">Latency</td>
                            <td style="padding: 10px; border: 1px solid #E2E8F0; color: #1E293B;">{round(latency_ms, 2)} ms</td>
                        </tr>
                        <tr>
                            <td style="padding: 10px; border: 1px solid #E2E8F0; font-weight: bold; background-color: #F8FAFC;">Checked Timestamp</td>
                            <td style="padding: 10px; border: 1px solid #E2E8F0; color: #1E293B;">{timestamp}</td>
                        </tr>
                        {error_row}
                    </tbody>
                </table>
                
                <div style="margin-top: 30px; text-align: center;">
                    <a href="http://localhost:8000" style="background-color: #1F2937; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 15px; display: inline-block;">Open Health Dashboard</a>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #F1F5F9; padding: 16px; text-align: center; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B;">
                This email was sent by Website Health Monitor & Reporter (Automated Service).<br>
                Host Server Time: {timestamp}
            </div>
        </div>
    </body>
    </html>
    """

    # Always log locally first for transparent testing
    log_email_alert_locally(subject, html_content)
    
    # Exit early if email alerts are not enabled/configured
    if not settings.enable_email_alerts or not settings.smtp_username or not settings.alert_receiver_email:
        print("[Email Info] Email notifications are disabled or incomplete in settings. Skipping actual SMTP send.")
        return

    try:
        # Construct Email Message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.smtp_username
        msg["To"] = settings.alert_receiver_email
        msg.attach(MIMEText(html_content, "html"))
        
        # Connect to SMTP
        server = smtplib.SMTP(settings.smtp_server, settings.smtp_port)
        server.starttls()
        server.login(settings.smtp_username, settings.smtp_password)
        server.sendmail(settings.smtp_username, settings.alert_receiver_email, msg.as_string())
        server.quit()
        print(f"[SMTP Alert] Email Alert sent successfully to: {settings.alert_receiver_email}")
    except Exception as e:
        print(f"[SMTP Error] Failed to send SMTP Email Alert: {e}")
        # Log the error description locally
        with open(ALERTS_LOG, "a", encoding="utf-8") as f:
            f.write(f"[ERROR SENDING EMAIL] {str(e)}\n\n")
