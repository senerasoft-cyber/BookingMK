from datetime import timedelta

from app.extensions import db
from app.models import Appointment, Client, utcnow
from tests.conftest import auth_headers, register_business


def create_appointment(
    app,
    business_id,
    status,
    service_name="Haircut",
    price=500,
    email="ana@example.com",
    staff_id=None,
):
    with app.app_context():
        client_obj = Client(business_id=business_id, email=email, name="Ana")
        db.session.add(client_obj)
        db.session.flush()
        starts_at = utcnow().replace(tzinfo=None)
        appt = Appointment(
            business_id=business_id,
            staff_id=staff_id,
            service_name=service_name,
            service_price=price,
            client_id=client_obj.id,
            starts_at=starts_at,
            ends_at=starts_at + timedelta(minutes=30),
            status=status,
        )
        db.session.add(appt)
        db.session.commit()
        return appt.id


def test_basic_plan_cannot_access_stats(client):
    data = register_business(client, plan_id="basic")
    token = data["access_token"]

    response = client.get("/me/stats", headers=auth_headers(token))
    assert response.status_code == 402
    assert response.get_json()["error"] == "plan_stats_not_allowed"


def test_mid_plan_can_access_stats(client):
    data = register_business(client, plan_id="mid")
    token = data["access_token"]

    response = client.get("/me/stats", headers=auth_headers(token))
    assert response.status_code == 200


def test_stats_counts_confirmed_revenue_and_cancellations(client, app):
    data = register_business(client)
    token = data["access_token"]
    business_id = data["business"]["id"]

    create_appointment(app, business_id, status="confirmed", price=500, email="ana@example.com")
    create_appointment(app, business_id, status="cancelled", price=300, email="bob@example.com")

    response = client.get("/me/stats", headers=auth_headers(token))
    assert response.status_code == 200
    body = response.get_json()
    assert body["confirmed_this_month"] == 1
    assert body["cancelled_this_month"] == 1
    assert body["revenue_this_month"] == 500.0
    assert len(body["bookings_by_day"]) == 14
    assert any(s["name"] == "Haircut" for s in body["top_services"])


def test_stats_scoped_to_staff_id(client, app):
    data = register_business(client)
    token = data["access_token"]
    business_id = data["business"]["id"]
    owner_staff_id = client.get("/staff", headers=auth_headers(token)).get_json()[0]["id"]
    second_staff = client.post(
        "/staff", headers=auth_headers(token), json={"name": "Second"}
    ).get_json()

    create_appointment(app, business_id, status="confirmed", price=500, staff_id=owner_staff_id)
    create_appointment(
        app,
        business_id,
        status="confirmed",
        price=900,
        email="bob@example.com",
        staff_id=second_staff["id"],
    )

    owner_only = client.get(
        f"/me/stats?staff_id={owner_staff_id}", headers=auth_headers(token)
    ).get_json()
    assert owner_only["confirmed_this_month"] == 1
    assert owner_only["revenue_this_month"] == 500.0

    whole_business = client.get("/me/stats", headers=auth_headers(token)).get_json()
    assert whole_business["confirmed_this_month"] == 2
    assert whole_business["revenue_this_month"] == 1400.0
