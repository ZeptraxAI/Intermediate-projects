import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging

logger = logging.getLogger(__name__)

class EmailManager:
    @staticmethod
    def compile_html_summary(articles, custom_message=""):
        """Compiles a professional, highly styled HTML newsletter template containing the articles."""
        
        # Build articles items HTML
        articles_html = ""
        
        if not articles:
            articles_html = """
            <div style="text-align: center; padding: 30px; border: 1px dashed #cbd5e1; border-radius: 8px; color: #64748b;">
                <p style="margin: 0; font-size: 16px;">No articles found in this summary.</p>
            </div>
            """
        else:
            for item in articles:
                source_color = "#3b82f6" # Default blue
                if item["source"] == "TechCrunch":
                    source_color = "#10b981" # Emerald/Green
                elif item["source"] == "Hacker News":
                    source_color = "#f97316" # Orange
                elif item["source"] == "BBC News":
                    source_color = "#ef4444" # Red
                    
                articles_html += f"""
                <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                    <div style="margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between;">
                        <span style="background-color: {source_color}; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em;">
                            {item["source"]}
                        </span>
                        <span style="color: #94a3b8; font-size: 12px;">{item["timestamp"]}</span>
                    </div>
                    <h3 style="margin-top: 0; margin-bottom: 8px; font-size: 18px; color: #0f172a; line-height: 1.4;">
                        <a href="{item["url"]}" target="_blank" style="color: #0f172a; text-decoration: none; font-weight: 700;">
                            {item["title"]}
                        </a>
                    </h3>
                    <p style="margin-top: 0; margin-bottom: 16px; font-size: 14px; color: #475569; line-height: 1.6;">
                        {item["summary"]}
                    </p>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 12px; color: #64748b;">By {item["author"]}</span>
                        <a href="{item["url"]}" target="_blank" style="background-color: #6366f1; color: #ffffff; font-size: 13px; font-weight: 600; padding: 8px 16px; border-radius: 8px; text-decoration: none; display: inline-block;">
                            Read Full Article &rarr;
                        </a>
                    </div>
                </div>
                """

        custom_message_html = ""
        if custom_message:
            custom_message_html = f"""
            <div style="background-color: #f8fafc; border-left: 4px solid #6366f1; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 30px; font-size: 15px; color: #334155; line-height: 1.6; font-style: italic;">
                {custom_message}
            </div>
            """

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>News Scraper Daily Summary</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 40px 20px; color: #1e293b;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 35px 30px; text-align: center; color: #ffffff;">
                    <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; background-color: rgba(255, 255, 255, 0.2); padding: 4px 12px; border-radius: 9999px;">
                        Daily Digest
                    </span>
                    <h1 style="margin-top: 15px; margin-bottom: 5px; font-size: 28px; font-weight: 800; letter-spacing: -0.025em;">
                        News Scraper Dashboard
                    </h1>
                    <p style="margin: 0; font-size: 14px; color: #e0e7ff; opacity: 0.9;">
                        Your personalized curation of technology, startup, and world news.
                    </p>
                </div>
                
                <!-- Content Area -->
                <div style="padding: 30px; background-color: #f8fafc;">
                    {custom_message_html}
                    
                    <div style="margin-bottom: 20px;">
                        <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">
                            Curated Headlines ({len(articles)})
                        </h2>
                    </div>
                    
                    {articles_html}
                </div>
                
                <!-- Footer -->
                <div style="background-color: #0f172a; padding: 25px 30px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 10px 0;">This summary was automatically compiled and sent via your <strong>News Scraper Dashboard</strong>.</p>
                    <p style="margin: 0;">&copy; {datetime.now().year} News Scraper. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        return html_body

    @classmethod
    def send_email(cls, recipient, articles, smtp_config, custom_message="", mock=True):
        """Sends the compiled HTML email to a recipient. Supports mock and real modes."""
        html_content = cls.compile_html_summary(articles, custom_message)
        
        if mock:
            logger.info(f"[MOCK EMAIL] Simulating email delivery to: {recipient}")
            logger.info(f"[MOCK EMAIL] Summary: {len(articles)} articles included.")
            return {
                "success": True,
                "mode": "mock",
                "recipient": recipient,
                "article_count": len(articles),
                "html_preview": html_content
            }
            
        # Real SMTP Delivery
        try:
            # Validate config
            host = smtp_config.get("host")
            port = int(smtp_config.get("port", 587))
            sender = smtp_config.get("sender")
            password = smtp_config.get("password")
            use_ssl = smtp_config.get("use_ssl", False)
            
            if not all([host, port, sender, password]):
                raise ValueError("Incomplete SMTP settings in configuration.")

            # Create message container
            msg = MIMEMultipart("alternative")
            msg["Subject"] = smtp_config.get("subject", "News Scraper - Automated Headlines Summary")
            msg["From"] = sender
            msg["To"] = recipient

            # Record the MIME types
            part = MIMEText(html_content, "html")
            msg.attach(part)

            # Connect and send
            if use_ssl:
                server = smtplib.SMTP_SSL(host, port, timeout=15)
            else:
                server = smtplib.SMTP(host, port, timeout=15)
                server.ehlo()
                server.starttls()  # Secure the connection
                server.ehlo()
                
            server.login(sender, password)
            server.sendmail(sender, recipient, msg.as_string())
            server.quit()
            
            logger.info(f"Successfully sent real email to {recipient} via {host}")
            return {
                "success": True,
                "mode": "real",
                "recipient": recipient,
                "article_count": len(articles),
                "html_preview": html_content
            }
            
        except Exception as e:
            logger.error(f"Failed to send email via SMTP: {e}")
            return {
                "success": False,
                "error": str(e),
                "html_preview": html_content
            }
from datetime import datetime
