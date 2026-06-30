import os
from datetime import date, timedelta

import pytest

os.environ["FLASK_ENV"] = "testing"

from app import create_app  # noqa: E402
from app.extensions import db  # noqa: E402


@pytest.fixture()
def app():
    app = create_app()
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


# Not "password123" -- that's now rejected as a too-common password by
# RegisterSchema's strength check (see app/schemas.py).
DEFAULT_TEST_PASSWORD = "Bukano-Demo42"


def register_business(
    client,
    email="owner@example.com",
    password=DEFAULT_TEST_PASSWORD,
    business_name="Studio Linija",
    plan_id="top",
):
    """Registers, verifies the email using the code from the DB directly
    (tests skip the real email step), and unless `plan_id=None`, immediately
    subscribes via the dev stub billing provider."""
    from app.models import User

    reg = client.post(
        "/auth/register",
        json={"email": email, "password": password, "business_name": business_name},
    )
    assert reg.status_code == 200, reg.get_json()
    assert reg.get_json()["status"] == "verification_required"

    # Grab the code hash from the DB and brute-force it via the verify endpoint.
    # In tests, SMTP is stubbed so we can't read the email; read from DB instead.
    # Patch the user's code hash with one we control so we can call verify.
    from app.auth import hash_password
    from app.extensions import db
    from app.models import User

    user = User.query.filter_by(email=email).first()
    known_code = "123456"
    user.email_verify_code_hash = hash_password(known_code)
    db.session.commit()

    verify = client.post(
        "/auth/register/verify", json={"email": email, "code": known_code}
    )
    assert verify.status_code == 201, verify.get_json()
    data = verify.get_json()

    if plan_id is not None:
        checkout = client.post(
            "/me/subscription/checkout",
            headers=auth_headers(data["access_token"]),
            json={"plan_id": plan_id},
        )
        assert checkout.status_code == 200, checkout.get_json()

    return data


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def upcoming_weekday(weekday: int) -> date:
    """Next date (strictly after today) matching `weekday` (Monday=0), within 14 days."""
    today = date.today()
    days_ahead = (weekday - today.weekday()) % 7
    days_ahead = days_ahead if days_ahead != 0 else 7
    return today + timedelta(days=days_ahead)
