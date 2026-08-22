# routes/password_reset.py
import os
import time
import random
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Blueprint, request, jsonify
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

logger = logging.getLogger("backend.password_reset")

password_reset_bp = Blueprint("password_reset", __name__, url_prefix="/api/auth/forgot-password")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase_admin = None
if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
    supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# In-memory store for OTP codes: email -> { "code": "123456", "expires": float, "role": "player" | "coach" }
OTP_STORE = {}

def send_gmail_otp(to_email: str, code: str, role: str):
    """Sends a 6-digit OTP verification code via Gmail SMTP."""
    sender_email = os.environ.get("GMAIL_SENDER") or os.environ.get("SMTP_EMAIL") or os.environ.get("EMAIL_USER") or "trainmaxai@gmail.com"
    app_password = os.environ.get("GMAIL_APP_PASSWORD") or os.environ.get("SMTP_PASSWORD") or os.environ.get("EMAIL_PASS")

    role_title = "Coach" if role == "coach" else "Player"

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0f0c29; color: #ffffff; padding: 25px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
      <h2 style="color: #6a11cb; text-align: center;">🏆 TrainMax AI - Password Reset</h2>
      <p style="color: rgba(255,255,255,0.8); font-size: 15px;">Hello {role_title},</p>
      <p style="color: rgba(255,255,255,0.8); font-size: 15px;">We received a request to reset your password for your TrainMax AI account. Use the verification code below:</p>
      <div style="background: rgba(255,255,255,0.1); padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
        <span style="font-size: 28px; font-weight: bold; color: #10b981; letter-spacing: 5px;">{code}</span>
      </div>
      <p style="color: rgba(255,255,255,0.6); font-size: 13px;">This code will expire in 15 minutes. If you did not request this, please ignore this email.</p>
      <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 20px 0;" />
      <p style="color: rgba(255,255,255,0.4); font-size: 12px; text-align: center;">TrainMax AI - Football Coaching & Training System</p>
    </div>
    """

    # Print to console for dev / testing visibility
    print(f"\n=======================================================")
    print(f"📧 [GMAIL VERIFICATION OTP] To: {to_email} | Role: {role_title}")
    print(f"🔐 VERIFICATION CODE: {code}")
    print(f"=======================================================\n")

    if not app_password:
        logger.warning(f"⚠️ No GMAIL_APP_PASSWORD found in .env. Email skipped, but OTP logged to console above: {code}")
        return True, "Code generated (Dev mode: check server console / return payload for code)."

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"🏆 TrainMax - Password Reset Verification Code: {code}"
        msg["From"] = f"TrainMax AI <{sender_email}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_content, "html"))

        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(sender_email, app_password)
            server.sendmail(sender_email, to_email, msg.as_string())
        
        logger.info(f"✅ OTP email sent successfully to {to_email}")
        return True, "Verification code sent to your Gmail!"
    except Exception as e:
        logger.error(f"❌ Failed to send SMTP email to {to_email}: {str(e)}")
        return True, f"Code generated (SMTP send failed: {str(e)}, check server logs/console for OTP)."


@password_reset_bp.post("/send-code")
def send_code():
    """Endpoint to generate and send verification code to user's email."""
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    role = (data.get("role") or "player").strip().lower()

    if not email:
        return jsonify({"success": False, "error": "Email is required"}), 400

    if not supabase_admin:
        return jsonify({"success": False, "error": "Supabase admin not configured on server"}), 500

    try:
        # Check if user exists in Supabase Auth or Profile table
        table_name = "coach_profiles" if role == "coach" else "user_profiles"
        res = supabase_admin.table(table_name).select("id, email").ilike("email", email).execute()

        user_found = len(res.data) > 0 if res.data else False
        if not user_found:
            # Fallback: check all auth users via Supabase admin list_users
            try:
                users_res = supabase_admin.auth.admin.list_users()
                for u in users_res:
                    if u.email and u.email.lower() == email:
                        user_found = True
                        break
            except Exception as auth_err:
                logger.warn(f"Error checking auth list_users: {auth_err}")

        if not user_found:
            return jsonify({"success": False, "error": f"No {role} account found with this email address."}), 400

        # Generate 6-digit code
        code = str(random.randint(100000, 999999))
        OTP_STORE[email] = {
            "code": code,
            "expires": time.time() + 900,  # Valid for 15 minutes
            "role": role
        }

        success, msg = send_gmail_otp(email, code, role)
        
        # Include dev_code if GMAIL_APP_PASSWORD is not set for seamless local dev & testing
        app_pass = os.environ.get("GMAIL_APP_PASSWORD") or os.environ.get("SMTP_PASSWORD")
        dev_code = code if not app_pass else None

        return jsonify({
            "success": True,
            "message": msg,
            "dev_code": dev_code
        }), 200

    except Exception as e:
        logger.error(f"❌ send-code error: {str(e)}")
        return jsonify({"success": False, "error": f"Failed to send code: {str(e)}"}), 500


@password_reset_bp.post("/verify-code")
def verify_code():
    """Verify if the entered OTP code is valid and not expired."""
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    code = (data.get("code") or "").strip()

    if not email or not code:
        return jsonify({"success": False, "error": "Email and verification code are required"}), 400

    record = OTP_STORE.get(email)
    if not record:
        return jsonify({"success": False, "error": "No verification code found for this email. Please request a new code."}), 400

    if time.time() > record["expires"]:
        OTP_STORE.pop(email, None)
        return jsonify({"success": False, "error": "Verification code has expired. Please request a new one."}), 400

    if record["code"] != code:
        return jsonify({"success": False, "error": "Invalid verification code. Please check and try again."}), 400

    return jsonify({"success": True, "message": "Verification code confirmed!"}), 200


@password_reset_bp.post("/reset-password")
def reset_password():
    """Reset the user's password in Supabase Auth after verification."""
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    code = (data.get("code") or "").strip()
    new_password = (data.get("new_password") or "").strip()

    if not email or not code or not new_password:
        return jsonify({"success": False, "error": "Email, verification code, and new password are required"}), 400

    if len(new_password) < 6:
        return jsonify({"success": False, "error": "Password must be at least 6 characters long."}), 400

    record = OTP_STORE.get(email)
    if not record or record["code"] != code:
        return jsonify({"success": False, "error": "Invalid or expired verification code."}), 400

    if time.time() > record["expires"]:
        OTP_STORE.pop(email, None)
        return jsonify({"success": False, "error": "Verification code has expired."}), 400

    if not supabase_admin:
        return jsonify({"success": False, "error": "Supabase admin not configured"}), 500

    try:
        # Find user ID in Supabase auth
        user_id = None
        users_res = supabase_admin.auth.admin.list_users()
        for u in users_res:
            if u.email and u.email.lower() == email:
                user_id = u.id
                break

        if not user_id:
            return jsonify({"success": False, "error": "User auth record not found."}), 404

        # Update password in Supabase Auth
        supabase_admin.auth.admin.update_user_by_id(user_id, {"password": new_password})
        
        # Clear code from store
        OTP_STORE.pop(email, None)
        logger.info(f"✅ Password successfully reset for {email}")

        return jsonify({"success": True, "message": "Password reset successfully! You can now log in with your new password."}), 200

    except Exception as e:
        logger.error(f"❌ reset-password error: {str(e)}")
        return jsonify({"success": False, "error": f"Failed to reset password: {str(e)}"}), 500
