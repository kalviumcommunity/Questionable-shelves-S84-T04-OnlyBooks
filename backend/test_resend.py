"""
Utility script to test Resend API key and email dispatch directly.
Usage:
    python test_resend.py your-email@example.com
"""
import asyncio
import sys
from app.config import settings
from app.services.email_service import send_verification_email

async def main():
    to_email = sys.argv[1] if len(sys.argv) > 1 else None
    
    resend_key = (settings.RESEND_API_KEY or "").strip()
    if not resend_key:
        print("\n[ERROR] RESEND_API_KEY is not set in backend/.env or system environment!")
        print("Add your Resend key to backend/.env like this:")
        print("  RESEND_API_KEY=re_your_api_key_here\n")
        return

    masked = resend_key[:6] + "..." + resend_key[-4:] if len(resend_key) > 10 else "***"
    print(f"\n[INFO] Found RESEND_API_KEY: {masked}")

    if not to_email:
        print("\n[USAGE] Run with your email address:")
        print("  .\\venv\\Scripts\\python test_resend.py your_account_email@gmail.com\n")
        print("NOTE: On Resend's free tier (using onboarding@resend.dev), emails can ONLY be")
        print("sent to the email address registered on your resend.com account.")
        print("To send to any recipient, verify your custom domain at https://resend.com/domains\n")
        return

    print(f"[INFO] Dispatching test verification email to: {to_email}...")
    success, message = await send_verification_email(to_email, "842109")
    
    if success:
        print(f"\n[SUCCESS] {message}")
        print(f"[+] Please check {to_email}'s inbox and Spam/Promotions folder!\n")
    else:
        print(f"\n[FAILED] {message}\n")

if __name__ == "__main__":
    asyncio.run(main())
