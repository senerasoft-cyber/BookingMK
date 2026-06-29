from datetime import timedelta

from app.extensions import db
from app.models import VerificationCode, utcnow
from app.notifier import StubNotifier, ViberNotifier, get_notifier
from app.rate_limit import EMAIL_MONTHLY_CAP
from app.turnstile import verify_turnstile
from tests.conftest import auth_headers, register_business, upcoming_weekday

MONDAY = 0


def create_service(client, token, name="Haircut", duration_minutes=30, price=400):
    response = client.post(
        "/services",
        headers=auth_headers(token),
        json={"name": name, "duration_minutes": duration_minutes, "price": price},
    )
    assert response.status_code == 201, response.get_json()
    return response.get_json()


def setup_business(client, require_verification=True, booking_mode="open"):
    data = register_business(client)
    token = data["access_token"]
    client.patch(
        "/me/business",
        headers=auth_headers(token),
        json={"require_verification": require_verification, "booking_mode": booking_mode},
    )
    service = create_service(client, token)
    slug = data["business"]["slug"]
    return token, service, slug


def backdate(email, minutes):
    record = (
        VerificationCode.query.filter_by(email=email)
        .order_by(VerificationCode.created_at.desc())
        .first()
    )
    record.created_at = utcnow() - timedelta(minutes=minutes)
    db.session.commit()


def backdate_latest(minutes):
    """Same idea as backdate(), but for the IP cooldown check, which is keyed
    off whichever VerificationCode row was created most recently overall
    rather than one email address."""
    record = VerificationCode.query.order_by(VerificationCode.created_at.desc()).first()
    record.created_at = utcnow() - timedelta(minutes=minutes)
    db.session.commit()


def test_verify_start_returns_dev_code(client):
    _token, service, slug = setup_business(client)
    monday = upcoming_weekday(MONDAY)

    response = client.post(
        f"/b/{slug}/verify/start",
        json={
            "service_id": service["id"],
            "starts_at": f"{monday}T09:00:00",
            "email": "ana@example.com",
        },
    )
    assert response.status_code == 201, response.get_json()
    body = response.get_json()
    assert body["sent"] is True
    assert body["channel"] == "email"
    assert len(body["dev_code"]) == 6


def test_verify_start_rejects_invalid_slot(client):
    _token, service, slug = setup_business(client)
    payload = {
        "service_id": service["id"],
        "starts_at": "2026-01-01T09:00:00",
        "email": "ana@example.com",
    }
    response = client.post(f"/b/{slug}/verify/start", json=payload)
    assert response.status_code in (400, 409)


def test_verify_start_honeypot_blocks_silently(client, app):
    _token, service, slug = setup_business(client)
    monday = upcoming_weekday(MONDAY)

    response = client.post(
        f"/b/{slug}/verify/start",
        json={
            "service_id": service["id"],
            "starts_at": f"{monday}T09:00:00",
            "email": "ana@example.com",
            "website": "http://spam.example",
        },
    )
    assert response.status_code == 400
    with app.app_context():
        assert VerificationCode.query.count() == 0


def test_verify_start_email_cooldown(client):
    _token, service, slug = setup_business(client)
    monday = upcoming_weekday(MONDAY)
    payload = {
        "service_id": service["id"],
        "starts_at": f"{monday}T09:00:00",
        "email": "ana@example.com",
    }

    first = client.post(f"/b/{slug}/verify/start", json=payload)
    assert first.status_code == 201

    second = client.post(f"/b/{slug}/verify/start", json=payload)
    assert second.status_code == 429
    assert second.get_json()["error"] == "rate_limited"


def test_verify_start_email_daily_max(client, app):
    _token, service, slug = setup_business(client)
    monday = upcoming_weekday(MONDAY)
    payload = {
        "service_id": service["id"],
        "starts_at": f"{monday}T09:00:00",
        "email": "ana@example.com",
    }

    for _ in range(5):
        response = client.post(f"/b/{slug}/verify/start", json=payload)
        assert response.status_code == 201
        with app.app_context():
            backdate("ana@example.com", minutes=2)

    sixth = client.post(f"/b/{slug}/verify/start", json=payload)
    assert sixth.status_code == 429
    assert sixth.get_json()["error"] == "rate_limited"


def test_verify_start_business_monthly_cap(client, app):
    """Email's monthly cap is a flat anti-abuse ceiling (EMAIL_MONTHLY_CAP),
    not derived from plan price like the dormant phone-channel cap is --
    email is cheap enough that cost isn't the reason to cap it."""
    _token, service, slug = setup_business(client)
    monday = upcoming_weekday(MONDAY)
    cap = EMAIL_MONTHLY_CAP

    for i in range(cap):
        email = f"client{i}@example.com"
        response = client.post(
            f"/b/{slug}/verify/start",
            json={"service_id": service["id"], "starts_at": f"{monday}T09:00:00", "email": email},
        )
        assert response.status_code == 201, response.get_json()
        with app.app_context():
            backdate_latest(minutes=2)

    blocked = client.post(
        f"/b/{slug}/verify/start",
        json={
            "service_id": service["id"],
            "starts_at": f"{monday}T09:00:00",
            "email": f"client{cap}@example.com",
        },
    )
    assert blocked.status_code == 429
    assert blocked.get_json()["error"] == "daily_cap_reached"


def test_verify_check_success_returns_token(client):
    _token, service, slug = setup_business(client)
    monday = upcoming_weekday(MONDAY)
    start = client.post(
        f"/b/{slug}/verify/start",
        json={
            "service_id": service["id"],
            "starts_at": f"{monday}T09:00:00",
            "email": "ana@example.com",
        },
    )
    code = start.get_json()["dev_code"]

    check = client.post(f"/b/{slug}/verify/check", json={"email": "ana@example.com", "code": code})
    assert check.status_code == 200
    body = check.get_json()
    assert body["verified"] is True
    assert body["verification_token"]


def test_verify_check_wrong_code_increments_attempts(client, app):
    _token, service, slug = setup_business(client)
    monday = upcoming_weekday(MONDAY)
    client.post(
        f"/b/{slug}/verify/start",
        json={
            "service_id": service["id"],
            "starts_at": f"{monday}T09:00:00",
            "email": "ana@example.com",
        },
    )

    response = client.post(
        f"/b/{slug}/verify/check", json={"email": "ana@example.com", "code": "000000"}
    )
    assert response.status_code == 400
    assert response.get_json()["error"] == "invalid_code"
    with app.app_context():
        assert VerificationCode.query.first().attempts == 1


def test_verify_check_too_many_attempts(client):
    _token, service, slug = setup_business(client)
    monday = upcoming_weekday(MONDAY)
    client.post(
        f"/b/{slug}/verify/start",
        json={
            "service_id": service["id"],
            "starts_at": f"{monday}T09:00:00",
            "email": "ana@example.com",
        },
    )

    for _ in range(5):
        client.post(f"/b/{slug}/verify/check", json={"email": "ana@example.com", "code": "000000"})

    response = client.post(
        f"/b/{slug}/verify/check", json={"email": "ana@example.com", "code": "000000"}
    )
    assert response.status_code == 429
    assert response.get_json()["error"] == "too_many_attempts"


def test_verify_check_expired_code(client, app):
    _token, service, slug = setup_business(client)
    monday = upcoming_weekday(MONDAY)
    start = client.post(
        f"/b/{slug}/verify/start",
        json={
            "service_id": service["id"],
            "starts_at": f"{monday}T09:00:00",
            "email": "ana@example.com",
        },
    )
    code = start.get_json()["dev_code"]

    with app.app_context():
        record = VerificationCode.query.first()
        record.expires_at = utcnow() - timedelta(minutes=1)
        db.session.commit()

    response = client.post(
        f"/b/{slug}/verify/check", json={"email": "ana@example.com", "code": code}
    )
    assert response.status_code == 400
    assert response.get_json()["error"] == "code_expired"


def test_book_requires_verification_when_enabled(client):
    _token, service, slug = setup_business(client, require_verification=True)
    monday = upcoming_weekday(MONDAY)

    response = client.post(
        f"/b/{slug}/book",
        json={
            "service_id": service["id"],
            "starts_at": f"{monday}T09:00:00",
            "name": "Ana",
            "email": "ana@example.com",
        },
    )
    assert response.status_code == 400
    assert response.get_json()["error"] == "verification_required"


def test_book_succeeds_with_valid_verification_token(client):
    _token, service, slug = setup_business(client, require_verification=True, booking_mode="open")
    monday = upcoming_weekday(MONDAY)
    start = client.post(
        f"/b/{slug}/verify/start",
        json={
            "service_id": service["id"],
            "starts_at": f"{monday}T09:00:00",
            "email": "ana@example.com",
        },
    )
    code = start.get_json()["dev_code"]
    check = client.post(f"/b/{slug}/verify/check", json={"email": "ana@example.com", "code": code})
    verification_token = check.get_json()["verification_token"]

    response = client.post(
        f"/b/{slug}/book",
        json={
            "service_id": service["id"],
            "starts_at": f"{monday}T09:00:00",
            "name": "Ana",
            "email": "ana@example.com",
            "verification_token": verification_token,
        },
    )
    assert response.status_code == 201
    assert response.get_json()["status"] == "confirmed"


def test_book_rejects_token_issued_for_different_email(client):
    _token, service, slug = setup_business(client, require_verification=True)
    monday = upcoming_weekday(MONDAY)
    start = client.post(
        f"/b/{slug}/verify/start",
        json={
            "service_id": service["id"],
            "starts_at": f"{monday}T09:00:00",
            "email": "ana@example.com",
        },
    )
    code = start.get_json()["dev_code"]
    check = client.post(f"/b/{slug}/verify/check", json={"email": "ana@example.com", "code": code})
    verification_token = check.get_json()["verification_token"]

    response = client.post(
        f"/b/{slug}/book",
        json={
            "service_id": service["id"],
            "starts_at": f"{monday}T09:00:00",
            "name": "Bob",
            "email": "bob@example.com",
            "verification_token": verification_token,
        },
    )
    assert response.status_code == 400
    assert response.get_json()["error"] == "verification_required"


def test_book_fallback_skip_verification_forces_pending(client):
    _token, service, slug = setup_business(client, require_verification=True, booking_mode="open")
    monday = upcoming_weekday(MONDAY)

    response = client.post(
        f"/b/{slug}/book",
        json={
            "service_id": service["id"],
            "starts_at": f"{monday}T09:00:00",
            "name": "Ana",
            "email": "ana@example.com",
            "skip_verification": True,
        },
    )
    assert response.status_code == 201
    assert response.get_json()["status"] == "pending"


def test_get_notifier_defaults_to_stub_without_twilio_creds(app):
    """notifier.py/phone-based channels are dormant (not reachable from the
    current public flow) but kept intact for a future phone-channel add-on."""
    with app.app_context():
        assert isinstance(get_notifier("sms"), StubNotifier)
        assert isinstance(get_notifier("whatsapp"), StubNotifier)
        assert isinstance(get_notifier("viber"), ViberNotifier)


def test_turnstile_dev_passthrough_without_secret(app):
    with app.app_context():
        assert verify_turnstile(None, "127.0.0.1") is True
        assert verify_turnstile("anything", "127.0.0.1") is True
