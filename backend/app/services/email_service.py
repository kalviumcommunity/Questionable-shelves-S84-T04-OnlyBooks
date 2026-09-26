import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from ..config import settings

logger = logging.getLogger(__name__)

def _send_sync_email(to_email: str, code: str) -> tuple[bool, str]:
    """Synchronously connects to SMTP server and sends verification code email."""
    smtp_host = (settings.SMTP_HOST or "").strip()
    smtp_user = (settings.SMTP_USER or "").strip()
    # Google App Passwords are 16 letters usually formatted with spaces (e.g. "abcd efgh ijkl mnop")
    smtp_password = (settings.SMTP_PASSWORD or "").replace(" ", "").strip()

    if not smtp_host:
        return False, "SMTP_HOST is missing in server environment variables"
    if not smtp_user:
        return False, "SMTP_USER is missing in server environment variables"
    if not smtp_password:
        return False, "SMTP_PASSWORD is missing in server environment variables"

    sender_email = (settings.SMTP_FROM_EMAIL or smtp_user).strip()
    sender_name = settings.SMTP_FROM_NAME or "OnlyBooks Library Archive"
    from_header = f"{sender_name} <{sender_email}>"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Your OnlyBooks Verification Code: {code}"
    msg["From"] = from_header
    msg["To"] = to_email

    text_content = f"""
OnlyBooks Academic Archive - Identity Verification

Your 6-digit verification code is: {code}

Enter this code on the OnlyBooks verification screen to activate your academic account.
This verification code is valid for 5 minutes.

If you did not request this verification code, please ignore this email.
"""

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OnlyBooks Verification Code</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);">
    <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 32px 28px; text-align: center; color: #ffffff;">
      <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em;">🏛️ OnlyBooks Academic Archive</h1>
      <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; color: #bfdbfe;">Institutional Researcher Verification</p>
    </div>
    <div style="padding: 32px 28px; text-align: center;">
      <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin-bottom: 12px;">One-Time Verification Code</div>
      <div style="display: inline-block; background: #eff6ff; border: 2px dashed #93c5fd; border-radius: 12px; padding: 14px 32px; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #1d4ed8; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; margin: 6px 0 20px 0;">{code}</div>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
        Please enter this 6-digit code on the registration page to verify your email address (<strong>{to_email}</strong>) and activate your institutional clearance.
      </p>
      <div style="background: #f8fafc; border-radius: 10px; padding: 12px 16px; font-size: 12px; color: #64748b; border: 1px solid #e2e8f0; margin-bottom: 8px;">
        ⏳ This verification code expires in <strong>5 minutes</strong>.
      </div>
      <p style="font-size: 11px; color: #94a3b8; margin: 16px 0 0 0;">
        If you did not request this registration, no action is required and this code will expire automatically.
      </p>
    </div>
    <div style="border-top: 1px solid #f1f5f9; padding: 16px 28px; text-align: center; font-size: 11px; color: #94a3b8; background-color: #fbfcfe;">
      Protected by Institutional TLS &middot; OnlyBooks Library Archive System
    </div>
  </div>
</body>
</html>"""

    msg.attach(MIMEText(text_content, "plain"))
    msg.attach(MIMEText(html_content, "html"))

    try:
        port = int(settings.SMTP_PORT)
        if port == 465:
            with smtplib.SMTP_SSL(smtp_host, port, timeout=12) as server:
                server.login(smtp_user, smtp_password)
                server.sendmail(sender_email, [to_email], msg.as_string())
        else:
            with smtplib.SMTP(smtp_host, port, timeout=12) as server:
                if settings.SMTP_TLS:
                    server.starttls()
                server.login(smtp_user, smtp_password)
                server.sendmail(sender_email, [to_email], msg.as_string())
        logger.info(f"Verification email successfully dispatched to {to_email}")
        return True, "Email dispatched successfully"
    except Exception as e:
        err_msg = f"SMTP error: {str(e)}"
        logger.error(f"Failed to dispatch verification email to {to_email}: {err_msg}")
        return False, err_msg

async def send_verification_email(to_email: str, code: str) -> tuple[bool, str]:
    """Asynchronously dispatches an academic verification email without blocking."""
    return await asyncio.to_thread(_send_sync_email, to_email, code)
