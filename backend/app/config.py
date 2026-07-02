import os
import tempfile
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

INSTANCE_DIR = BASE_DIR / "instance"
INSTANCE_DIR.mkdir(exist_ok=True)


class Config:
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", f"sqlite:///{INSTANCE_DIR / 'dev.db'}")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET = os.environ.get("JWT_SECRET", "dev-insecure-secret-change-me")
    JWT_ACCESS_TTL_MINUTES = int(os.environ.get("JWT_ACCESS_TTL_MINUTES", "15"))
    JWT_REFRESH_TTL_DAYS = int(os.environ.get("JWT_REFRESH_TTL_DAYS", "30"))
    CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")

    TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")
    TWILIO_SMS_FROM = os.environ.get("TWILIO_SMS_FROM", "")
    TWILIO_WHATSAPP_FROM = os.environ.get("TWILIO_WHATSAPP_FROM", "")
    TURNSTILE_SECRET_KEY = os.environ.get("TURNSTILE_SECRET_KEY", "")
    ALLOWED_COUNTRY_CODES = os.environ.get("ALLOWED_COUNTRY_CODES", "389").split(",")
    DAILY_SMS_CAP = int(os.environ.get("DAILY_SMS_CAP", "50"))

    UPLOADS_DIR = str(BASE_DIR / os.environ.get("UPLOADS_DIR", "instance/uploads"))
    UPLOADS_BASE_URL = os.environ.get("UPLOADS_BASE_URL", "http://localhost:5000/uploads")
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # 5MB upload limit

    # In-process scheduler for the reminder job (Milestone 6). Disable this on
    # multi-worker production deployments (each worker would run its own
    # scheduler and double-send) and run `flask send-reminders` from cron instead.
    ENABLE_REMINDER_SCHEDULER = (
        os.environ.get("ENABLE_REMINDER_SCHEDULER", "true").lower() == "true"
    )
    REMINDER_INTERVAL_MINUTES = int(os.environ.get("REMINDER_INTERVAL_MINUTES", "1"))

    # Subscriptions (Milestone 8). Leave PADDLE_API_KEY unset in dev: billing.py
    # falls back to a stub provider that activates plans immediately with no
    # real payment, so the whole paywall flow works without a Paddle account.
    PADDLE_API_KEY = os.environ.get("PADDLE_API_KEY", "")
    PADDLE_WEBHOOK_SECRET = os.environ.get("PADDLE_WEBHOOK_SECRET", "")
    PADDLE_SANDBOX = os.environ.get("PADDLE_SANDBOX", "true").lower() == "true"
    PADDLE_PRICE_IDS = {
        "basic_monthly": os.environ.get("PADDLE_PRICE_ID_BASIC_MONTHLY", ""),
        "basic_yearly": os.environ.get("PADDLE_PRICE_ID_BASIC_YEARLY", ""),
        "mid_monthly": os.environ.get("PADDLE_PRICE_ID_MID_MONTHLY", ""),
        "mid_yearly": os.environ.get("PADDLE_PRICE_ID_MID_YEARLY", ""),
        "top_monthly": os.environ.get("PADDLE_PRICE_ID_TOP_MONTHLY", ""),
        "top_yearly": os.environ.get("PADDLE_PRICE_ID_TOP_YEARLY", ""),
    }

    # Email. Leave SMTP_HOST unset in dev: email_sender.py falls back to a stub
    # that logs to the console instead of sending anything, same idea as the
    # SMS/billing stubs above.
    SMTP_HOST = os.environ.get("SMTP_HOST", "")
    SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
    SMTP_USERNAME = os.environ.get("SMTP_USERNAME", "")
    SMTP_PASSWORD = os.environ.get("SMTP_PASSWORD", "")
    SMTP_USE_TLS = os.environ.get("SMTP_USE_TLS", "true").lower() == "true"
    SMTP_FROM_EMAIL = os.environ.get("SMTP_FROM_EMAIL", "no-reply@bukano.local")
    FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")


class DevConfig(Config):
    DEBUG = True


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    UPLOADS_DIR = str(Path(tempfile.gettempdir()) / "maceda-booking-test-uploads")
    ENABLE_REMINDER_SCHEDULER = False


class ProdConfig(Config):
    DEBUG = False


def get_config():
    env = os.environ.get("FLASK_ENV", "development")
    return {"development": DevConfig, "testing": TestConfig, "production": ProdConfig}.get(
        env, DevConfig
    )
