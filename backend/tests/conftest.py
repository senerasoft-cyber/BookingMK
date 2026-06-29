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


def register_business(
    client,
    email="owner@example.com",
    password="password123",
    business_name="Studio Linija",
    plan_id="top",
):
    """Registers and, unless `plan_id=None`, immediately subscribes to `plan_id`
    via the dev stub billing provider (no real payment in tests) -- the vast
    majority of tests are about booking/staff/etc. behavior, not the paywall
    itself, so they shouldn't all have to know a subscription is required.
    Tests for the paywall itself pass plan_id=None to get an unsubscribed
    business on purpose.
    """
    response = client.post(
        "/auth/register",
        json={"email": email, "password": password, "business_name": business_name},
    )
    assert response.status_code == 201, response.get_json()
    data = response.get_json()

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
