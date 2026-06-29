from datetime import timedelta

from app.billing import is_subscription_active
from app.extensions import db
from app.models import utcnow
from app.promo import generate_promo_codes
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


def test_generate_promo_codes_creates_unique_codes(app):
    with app.app_context():
        codes = generate_promo_codes(count=5, duration_days=30, plan_id="top", note="friends")
        assert len(codes) == 5
        assert len({c.code for c in codes}) == 5
        assert all(c.plan_id == "top" for c in codes)


def test_redeem_promo_code_activates_subscription(client, app):
    data = register_business(client, plan_id=None)
    token = data["access_token"]

    with app.app_context():
        code = generate_promo_codes(count=1, duration_days=30, plan_id="top", note=None)[0].code

    response = client.post(
        "/me/subscription/redeem-promo", headers=auth_headers(token), json={"code": code}
    )
    assert response.status_code == 200
    body = response.get_json()
    assert body["plan_id"] == "top"
    assert body["subscription_status"] == "active"
    assert body["subscription_provider"] == "promo"
    assert body["current_period_end"] is not None


def test_redeem_promo_code_is_one_time_use(client, app):
    data_a = register_business(client, plan_id=None, email="a@example.com", business_name="A")
    data_b = register_business(client, plan_id=None, email="b@example.com", business_name="B")

    with app.app_context():
        code = generate_promo_codes(count=1, duration_days=30, plan_id="top", note=None)[0].code

    first = client.post(
        "/me/subscription/redeem-promo",
        headers=auth_headers(data_a["access_token"]),
        json={"code": code},
    )
    assert first.status_code == 200

    second = client.post(
        "/me/subscription/redeem-promo",
        headers=auth_headers(data_b["access_token"]),
        json={"code": code},
    )
    assert second.status_code == 400
    assert second.get_json()["error"] == "already_redeemed"


def test_redeem_invalid_promo_code(client):
    data = register_business(client, plan_id=None)
    token = data["access_token"]

    response = client.post(
        "/me/subscription/redeem-promo", headers=auth_headers(token), json={"code": "NOTREAL1"}
    )
    assert response.status_code == 400
    assert response.get_json()["error"] == "invalid_code"


def test_promo_redeemed_business_can_take_public_bookings(client, app):
    data = register_business(client, plan_id=None)
    token = data["access_token"]
    service = create_service(client, token)
    slug = data["business"]["slug"]
    monday = upcoming_weekday(MONDAY)

    blocked = client.post(
        f"/b/{slug}/book",
        json={
            "service_id": service["id"],
            "starts_at": f"{monday}T09:00:00",
            "name": "Ana",
            "email": "ana@example.com",
        },
    )
    assert blocked.status_code == 402

    with app.app_context():
        code = generate_promo_codes(count=1, duration_days=30, plan_id="top", note=None)[0].code
    client.post("/me/subscription/redeem-promo", headers=auth_headers(token), json={"code": code})

    allowed = client.post(
        f"/b/{slug}/book",
        json={
            "service_id": service["id"],
            "starts_at": f"{monday}T09:00:00",
            "name": "Ana",
            "email": "ana@example.com",
        },
    )
    assert allowed.status_code == 201


def test_expired_promo_subscription_blocks_booking_and_self_heals(client, app):
    data = register_business(client, plan_id=None)
    token = data["access_token"]
    service = create_service(client, token)
    business_id = data["business"]["id"]
    slug = data["business"]["slug"]
    monday = upcoming_weekday(MONDAY)

    code = generate_promo_codes(count=1, duration_days=30, plan_id="top", note=None)[0].code
    client.post("/me/subscription/redeem-promo", headers=auth_headers(token), json={"code": code})

    from app.models import Business

    business = db.session.get(Business, business_id)
    business.current_period_end = utcnow() - timedelta(days=1)
    db.session.commit()

    response = client.post(
        f"/b/{slug}/book",
        json={
            "service_id": service["id"],
            "starts_at": f"{monday}T09:00:00",
            "name": "Ana",
            "email": "ana@example.com",
        },
    )
    assert response.status_code == 402

    db.session.expire_all()
    business = db.session.get(Business, business_id)
    assert business.subscription_status == "canceled"


def test_is_subscription_active_helper(app):
    with app.app_context():
        from app.auth import hash_password
        from app.models import Business, User

        user = User(email="solo@example.com", password_hash=hash_password("password123"))
        business = Business(owner=user, name="Solo", slug="solo", subscription_status="none")
        db.session.add(user)
        db.session.add(business)
        db.session.commit()

        assert is_subscription_active(business) is False

        business.subscription_status = "active"
        business.current_period_end = utcnow() + timedelta(days=10)
        db.session.commit()
        assert is_subscription_active(business) is True

        business.current_period_end = utcnow() - timedelta(days=1)
        db.session.commit()
        assert is_subscription_active(business) is False
