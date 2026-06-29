import os
import sys

import click
from flask import Flask
from flask_cors import CORS

from app.config import get_config
from app.extensions import db, migrate


def _ensure_utf8_console() -> None:
    """Business/service names and reminder text are routinely Cyrillic. The
    default console encoding on Windows (cp1252) raises UnicodeEncodeError on
    print() for that text, which would crash the reminder job and CLI
    commands -- force UTF-8 with a safe fallback instead of failing.
    """
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")


def create_app() -> Flask:
    _ensure_utf8_console()

    app = Flask(__name__)
    app.config.from_object(get_config())

    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app, origins=app.config["CORS_ORIGINS"])

    from app.blueprints.admin import admin_bp
    from app.blueprints.auth import auth_bp
    from app.blueprints.config import config_bp
    from app.blueprints.health import health_bp
    from app.blueprints.owner import owner_bp
    from app.blueprints.public import public_bp
    from app.blueprints.uploads import uploads_bp
    from app.blueprints.webhooks import webhooks_bp

    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(owner_bp)
    app.register_blueprint(config_bp)
    app.register_blueprint(public_bp)
    app.register_blueprint(uploads_bp)
    app.register_blueprint(webhooks_bp)
    app.register_blueprint(admin_bp)

    _register_cli(app)
    _start_reminder_scheduler(app)

    return app


def _register_cli(app: Flask) -> None:
    @app.cli.command("send-reminders")
    def send_reminders_command():
        from app.reminders import send_due_reminders

        count = send_due_reminders()
        print(f"Sent {count} reminder(s).")

    @app.cli.command("seed")
    def seed_command():
        from app.seed import DEMO_PASSWORD, seed_demo_data

        created = seed_demo_data()
        for business in created:
            print(f"  /b/{business.slug}  (owner login password: {DEMO_PASSWORD})")
        print(f"Seeded {len(created)} business(es).")

    @app.cli.command("create-admin")
    @click.argument("email")
    def create_admin_command(email):
        from app.extensions import db
        from app.models import User

        user = User.query.filter_by(email=email.lower()).first()
        if user is None:
            print(f"No user found with email {email}")
            return
        user.is_platform_admin = True
        db.session.commit()
        print(f"{email} is now a platform admin.")

    @app.cli.command("generate-promo-codes")
    @click.option("--count", default=1, help="How many codes to generate.")
    @click.option("--days", default=30, help="How many days of access each code grants.")
    @click.option("--plan", default="top", help="Plan id to grant (basic/mid/top).")
    @click.option("--note", default=None, help="Optional label, e.g. 'friends June 2026'.")
    def generate_promo_codes_command(count, days, plan, note):
        from app.promo import generate_promo_codes

        if plan not in {"basic", "mid", "top"}:
            print(f"Unknown plan '{plan}' -- use basic, mid, or top.")
            return

        codes = generate_promo_codes(count=count, duration_days=days, plan_id=plan, note=note)
        for code in codes:
            print(code.code)
        print(f"Generated {len(codes)} promo code(s), each granting {plan} for {days} day(s).")


def _start_reminder_scheduler(app: Flask) -> None:
    if not app.config.get("ENABLE_REMINDER_SCHEDULER"):
        return
    # Under the Werkzeug debug reloader, the app factory runs once in the
    # watcher process and once in the actual server process -- only start in
    # the latter so the job doesn't run (and double-send) twice.
    if app.debug and os.environ.get("WERKZEUG_RUN_MAIN") != "true":
        return

    from apscheduler.schedulers.background import BackgroundScheduler

    from app.reminders import send_due_reminders

    def job():
        with app.app_context():
            sent = send_due_reminders()
            if sent:
                print(f"[reminders] sent {sent} reminder(s)", flush=True)

    scheduler = BackgroundScheduler(daemon=True)
    scheduler.add_job(
        job,
        "interval",
        minutes=app.config["REMINDER_INTERVAL_MINUTES"],
        id="send_due_reminders",
        replace_existing=True,
    )
    scheduler.start()
    app.extensions["reminder_scheduler"] = scheduler
