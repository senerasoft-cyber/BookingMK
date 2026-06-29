import pytest

from app.billing import get_billing_provider
from app.models import Business
from app.notifier import StubNotifier, get_notifier
from tests.conftest import auth_headers, register_business, upcoming_weekday

MONDAY = 0


def test_billing_provider_refuses_dev_stub_outside_dev_or_test(app):
    with app.app_context():
        app.testing = False
        app.debug = False
        try:
            with pytest.raises(RuntimeError):
                get_billing_provider()
        finally:
            app.testing = True


def create_service(client, token, name="Haircut", duration_minutes=30, price=400):
    response = client.post(
        "/services",
        headers=auth_headers(token),
        json={"name": name, "duration_minutes": duration_minutes, "price": price},
    )
    assert response.status_code == 201, response.get_json()
    return response.get_json()


def test_unsubscribed_business_blocks_public_booking_surface(client):
    data = register_business(client, plan_id=None)
    token = data["access_token"]
    create_service(client, token)
    slug = data["business"]["slug"]

    response = client.get(f"/b/{slug}")
    assert response.status_code == 402
    assert response.get_json()["error"] == "subscription_required"


def test_checkout_with_stub_provider_activates_immediately(client):
    data = register_business(client, plan_id=None)
    token = data["access_token"]
    headers = auth_headers(token)
    slug = data["business"]["slug"]

    checkout = client.post("/me/subscription/checkout", headers=headers, json={"plan_id": "basic"})
    assert checkout.status_code == 200
    body = checkout.get_json()["business"]
    assert body["plan_id"] == "basic"
    assert body["subscription_status"] == "active"

    response = client.get(f"/b/{slug}")
    assert response.status_code == 200


def test_checkout_rejects_unknown_plan(client):
    data = register_business(client, plan_id=None)
    headers = auth_headers(data["access_token"])

    response = client.post("/me/subscription/checkout", headers=headers, json={"plan_id": "nope"})
    assert response.status_code == 400


def test_cancel_subscription_blocks_public_surface_again(client):
    data = register_business(client, plan_id="basic")
    token = data["access_token"]
    headers = auth_headers(token)
    slug = data["business"]["slug"]
    create_service(client, token)
    assert client.get(f"/b/{slug}").status_code == 200

    cancel = client.post("/me/subscription/cancel", headers=headers)
    assert cancel.get_json()["subscription_status"] == "canceled"
    assert client.get(f"/b/{slug}").status_code == 402


def test_basic_plan_limits_staff_to_one(client):
    data = register_business(client, plan_id="basic")
    headers = auth_headers(data["access_token"])

    response = client.post("/staff", headers=headers, json={"name": "Second"})
    assert response.status_code == 402
    assert response.get_json()["error"] == "plan_staff_limit_reached"


def test_mid_plan_allows_up_to_three_staff(client):
    data = register_business(client, plan_id="mid")
    headers = auth_headers(data["access_token"])

    for i in range(2):
        response = client.post("/staff", headers=headers, json={"name": f"Staff {i}"})
        assert response.status_code == 201

    fourth = client.post("/staff", headers=headers, json={"name": "Fourth"})
    assert fourth.status_code == 402


def test_top_plan_allows_unlimited_staff(client):
    data = register_business(client, plan_id="top")
    headers = auth_headers(data["access_token"])

    for i in range(5):
        response = client.post("/staff", headers=headers, json={"name": f"Staff {i}"})
        assert response.status_code == 201


def test_checkout_rejects_plan_too_small_for_existing_staff(client):
    data = register_business(client, plan_id="mid")
    headers = auth_headers(data["access_token"])
    client.post("/staff", headers=headers, json={"name": "Second"})
    client.post("/staff", headers=headers, json={"name": "Third"})

    response = client.post("/me/subscription/checkout", headers=headers, json={"plan_id": "basic"})
    assert response.status_code == 400
    assert response.get_json()["error"] == "plan_too_small_for_existing_staff"


def test_basic_plan_allows_branding_upload(client):
    """Branding used to be Mid/Top-only; it's baseline on every plan now."""
    import io

    data = register_business(client, plan_id="basic")
    headers = auth_headers(data["access_token"])

    response = client.post(
        "/uploads",
        headers=headers,
        data={"kind": "logo", "file": (io.BytesIO(b"fake-png-bytes"), "logo.png")},
        content_type="multipart/form-data",
    )
    assert response.status_code == 201


def test_mid_plan_allows_branding_upload(client):
    import io

    data = register_business(client, plan_id="mid")
    headers = auth_headers(data["access_token"])

    response = client.post(
        "/uploads",
        headers=headers,
        data={"kind": "logo", "file": (io.BytesIO(b"fake-png-bytes"), "logo.png")},
        content_type="multipart/form-data",
    )
    assert response.status_code == 201


def test_basic_plan_blocks_real_channels_even_with_twilio_configured(app):
    """Phone/SMS channels are dormant -- not reachable from the current public
    flow at all (verify/start only accepts email now) -- but the underlying
    plan gate in get_notifier() is kept intact for whenever a phone-channel
    add-on returns, so it's tested directly here rather than through HTTP."""
    with app.app_context():
        app.config["TWILIO_ACCOUNT_SID"] = "fake-sid"
        app.config["TWILIO_AUTH_TOKEN"] = "fake-token"
        app.config["TWILIO_SMS_FROM"] = "+1000000"
        try:
            business = Business(plan_id="basic")
            notifier = get_notifier("sms", business)
            assert isinstance(notifier, StubNotifier)
        finally:
            app.config["TWILIO_ACCOUNT_SID"] = ""
            app.config["TWILIO_AUTH_TOKEN"] = ""
            app.config["TWILIO_SMS_FROM"] = ""


def test_basic_plan_allows_auto_notify(client, capsys):
    """auto_notify used to be Top-only; it's baseline on every plan now that
    the underlying channel doesn't cost real money the way SMS did."""
    data = register_business(client, plan_id="basic")
    token = data["access_token"]
    headers = auth_headers(token)
    service = create_service(client, token)
    slug = data["business"]["slug"]
    monday = upcoming_weekday(MONDAY)
    booking = client.post(
        f"/b/{slug}/book",
        json={
            "service_id": service["id"],
            "starts_at": f"{monday}T09:00:00",
            "name": "Ana",
            "email": "ana@example.com",
        },
    ).get_json()

    capsys.readouterr()  # discard the booking-confirmation message, not what's under test
    client.post(
        f"/appointments/{booking['id']}/cancel", headers=headers, json={"notify_client": True}
    )
    assert "[stub-email]" in capsys.readouterr().out
