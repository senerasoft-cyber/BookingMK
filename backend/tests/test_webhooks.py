import hashlib
import hmac
import time

from tests.conftest import register_business

SECRET = "test-webhook-secret"


def _sign(body: bytes, secret: str = SECRET, ts: int | None = None) -> str:
    ts = ts if ts is not None else int(time.time())
    signed_payload = f"{ts}:{body.decode('utf-8')}".encode("utf-8")
    h1 = hmac.new(secret.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()
    return f"ts={ts};h1={h1}"


def test_webhook_rejects_missing_secret(client):
    response = client.post(
        "/webhooks/paddle",
        data=b'{"event_type": "subscription.created", "data": {}}',
        headers={"Paddle-Signature": "ts=1;h1=deadbeef"},
        content_type="application/json",
    )
    assert response.status_code == 401


def test_webhook_rejects_tampered_payload(client, app):
    with app.app_context():
        app.config["PADDLE_WEBHOOK_SECRET"] = SECRET
        try:
            signed_for_other_body = _sign(b'{"event_type": "subscription.created"}')
            response = client.post(
                "/webhooks/paddle",
                data=b'{"event_type": "subscription.canceled"}',
                headers={"Paddle-Signature": signed_for_other_body},
                content_type="application/json",
            )
            assert response.status_code == 401
        finally:
            app.config["PADDLE_WEBHOOK_SECRET"] = ""


def test_webhook_rejects_stale_timestamp(client, app):
    with app.app_context():
        app.config["PADDLE_WEBHOOK_SECRET"] = SECRET
        try:
            body = b'{"event_type": "subscription.created", "data": {}}'
            old_signature = _sign(body, ts=int(time.time()) - 600)
            response = client.post(
                "/webhooks/paddle",
                data=body,
                headers={"Paddle-Signature": old_signature},
                content_type="application/json",
            )
            assert response.status_code == 401
        finally:
            app.config["PADDLE_WEBHOOK_SECRET"] = ""


def test_webhook_with_valid_signature_updates_business(client, app):
    data = register_business(client, plan_id=None)
    business_id = data["business"]["id"]

    with app.app_context():
        app.config["PADDLE_WEBHOOK_SECRET"] = SECRET
        try:
            import json

            body = json.dumps(
                {
                    "event_type": "subscription.created",
                    "data": {
                        "id": "sub_123",
                        "customer_id": "ctm_456",
                        "status": "active",
                        "custom_data": {"business_id": business_id, "plan_id": "mid"},
                        "current_billing_period": {"ends_at": "2026-08-01T00:00:00Z"},
                    },
                }
            ).encode("utf-8")
            response = client.post(
                "/webhooks/paddle",
                data=body,
                headers={"Paddle-Signature": _sign(body)},
                content_type="application/json",
            )
            assert response.status_code == 200
        finally:
            app.config["PADDLE_WEBHOOK_SECRET"] = ""

    check = client.get(f"/b/{data['business']['slug']}")
    assert check.status_code == 200  # now active, public page reachable
