from datetime import datetime

from flask import Blueprint, current_app, jsonify, request

from app.billing import verify_paddle_signature
from app.extensions import db
from app.models import Business

webhooks_bp = Blueprint("webhooks", __name__, url_prefix="/webhooks")

ACTIVE_STATUSES = {"active", "trialing"}
INACTIVE_STATUSES = {"canceled", "paused"}


@webhooks_bp.post("/paddle")
def paddle_webhook():
    """Built against Paddle's documented webhook shape (event_type/data, with
    custom_data carried over from the checkout transaction) -- not verified
    against a live account's actual deliveries. Test against your sandbox's
    webhook simulator before relying on this in production.
    """
    secret = current_app.config["PADDLE_WEBHOOK_SECRET"]
    signature = request.headers.get("Paddle-Signature", "")
    if not secret or not verify_paddle_signature(request.get_data(), signature, secret):
        return jsonify({"error": "invalid_signature"}), 401

    event = request.get_json(silent=True) or {}
    event_type = event.get("event_type", "")
    data = event.get("data", {})

    if not (event_type.startswith("subscription.") or event_type.startswith("transaction.")):
        return jsonify({"received": True})

    custom_data = data.get("custom_data") or {}
    business = None
    if custom_data.get("business_id"):
        business = db.session.get(Business, custom_data["business_id"])
    if business is None and data.get("customer_id"):
        business = Business.query.filter_by(subscription_customer_id=data["customer_id"]).first()
    if business is None:
        # Nothing to update, but acknowledge so Paddle doesn't keep retrying.
        return jsonify({"received": True})

    if event_type == "subscription.canceled":
        business.subscription_status = "canceled"
    elif event_type in ("subscription.created", "subscription.updated"):
        business.subscription_id = data.get("id")
        business.subscription_customer_id = (
            data.get("customer_id") or business.subscription_customer_id
        )
        business.subscription_provider = "paddle"
        status = data.get("status")
        if status in ACTIVE_STATUSES:
            business.subscription_status = "active"
        elif status in INACTIVE_STATUSES:
            business.subscription_status = "canceled"
        else:
            business.subscription_status = "past_due"

        if custom_data.get("plan_id"):
            business.plan_id = custom_data["plan_id"]

        period_end = (data.get("current_billing_period") or {}).get("ends_at")
        if period_end:
            business.current_period_end = datetime.fromisoformat(period_end.replace("Z", "+00:00"))

    db.session.commit()
    return jsonify({"received": True})
