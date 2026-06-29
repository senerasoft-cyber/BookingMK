from app.extensions import db
from app.models import Client
from app.rate_limit import EMAIL_DAILY_MAX
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


def test_get_public_business_404_for_unknown_slug(client):
    response = client.get("/b/no-such-business")
    assert response.status_code == 404


def test_get_public_business_returns_active_services_only(client):
    data = register_business(client)
    token = data["access_token"]
    create_service(client, token, name="Active service")
    inactive = create_service(client, token, name="Inactive service")
    client.patch(f"/services/{inactive['id']}", headers=auth_headers(token), json={"active": False})

    response = client.get(f"/b/{data['business']['slug']}")
    assert response.status_code == 200
    body = response.get_json()
    assert [s["name"] for s in body["services"]] == ["Active service"]


def test_availability_returns_slots_within_working_hours(client):
    data = register_business(client)
    token = data["access_token"]
    service = create_service(client, token, duration_minutes=30)
    slug = data["business"]["slug"]
    monday = upcoming_weekday(MONDAY)

    response = client.get(f"/b/{slug}/availability?service_id={service['id']}&date={monday}")
    assert response.status_code == 200
    body = response.get_json()
    assert body["slots"][0] == f"{monday}T09:00:00"
    assert body["slots"][-1] == f"{monday}T16:30:00"


def test_availability_rejects_invalid_service(client):
    data = register_business(client)
    slug = data["business"]["slug"]
    monday = upcoming_weekday(MONDAY)
    response = client.get(f"/b/{slug}/availability?service_id=999&date={monday}")
    assert response.status_code == 400


def test_availability_rejects_past_date(client):
    data = register_business(client)
    token = data["access_token"]
    service = create_service(client, token)
    slug = data["business"]["slug"]
    response = client.get(f"/b/{slug}/availability?service_id={service['id']}&date=2000-01-01")
    assert response.status_code == 400


def test_book_open_mode_confirms_immediately(client):
    data = register_business(client)
    token = data["access_token"]
    service = create_service(client, token)
    slug = data["business"]["slug"]
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
    assert response.status_code == 201, response.get_json()
    assert response.get_json()["status"] == "confirmed"


def test_book_approve_every_always_pending(client):
    data = register_business(client)
    token = data["access_token"]
    client.patch(
        "/me/business", headers=auth_headers(token), json={"booking_mode": "approve_every"}
    )
    service = create_service(client, token)
    slug = data["business"]["slug"]
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
    assert response.get_json()["status"] == "pending"


def test_book_approved_clients_pending_then_confirmed_after_approval(client, app):
    data = register_business(client)
    token = data["access_token"]
    client.patch(
        "/me/business", headers=auth_headers(token), json={"booking_mode": "approved_clients"}
    )
    service = create_service(client, token)
    slug = data["business"]["slug"]
    monday = upcoming_weekday(MONDAY)

    first = client.post(
        f"/b/{slug}/book",
        json={
            "service_id": service["id"],
            "starts_at": f"{monday}T09:00:00",
            "name": "Ana",
            "email": "ana@example.com",
        },
    )
    assert first.get_json()["status"] == "pending"

    with app.app_context():
        approved = Client.query.filter_by(email="ana@example.com").first()
        approved.is_approved = True
        db.session.commit()

    second = client.post(
        f"/b/{slug}/book",
        json={
            "service_id": service["id"],
            "starts_at": f"{monday}T10:00:00",
            "name": "Ana",
            "email": "ana@example.com",
        },
    )
    assert second.get_json()["status"] == "confirmed"


def test_book_rejects_taken_slot(client):
    data = register_business(client)
    token = data["access_token"]
    service = create_service(client, token)
    slug = data["business"]["slug"]
    monday = upcoming_weekday(MONDAY)
    payload = {
        "service_id": service["id"],
        "starts_at": f"{monday}T09:00:00",
        "name": "Ana",
        "email": "ana@example.com",
    }

    first = client.post(f"/b/{slug}/book", json=payload)
    assert first.status_code == 201

    second_payload = {**payload, "email": "bob@example.com", "name": "Bob"}
    second = client.post(f"/b/{slug}/book", json=second_payload)
    assert second.status_code == 409


def test_booked_slot_disappears_from_availability(client):
    data = register_business(client)
    token = data["access_token"]
    service = create_service(client, token)
    slug = data["business"]["slug"]
    monday = upcoming_weekday(MONDAY)

    client.post(
        f"/b/{slug}/book",
        json={
            "service_id": service["id"],
            "starts_at": f"{monday}T09:00:00",
            "name": "Ana",
            "email": "ana@example.com",
        },
    )

    response = client.get(f"/b/{slug}/availability?service_id={service['id']}&date={monday}")
    assert f"{monday}T09:00:00" not in response.get_json()["slots"]


def test_book_rejects_invalid_email(client):
    data = register_business(client)
    token = data["access_token"]
    service = create_service(client, token)
    slug = data["business"]["slug"]
    monday = upcoming_weekday(MONDAY)

    response = client.post(
        f"/b/{slug}/book",
        json={
            "service_id": service["id"],
            "starts_at": f"{monday}T09:00:00",
            "name": "Ana",
            "email": "not-an-email",
        },
    )
    assert response.status_code == 400


def test_book_rejects_invalid_phone_when_provided(client):
    data = register_business(client)
    token = data["access_token"]
    service = create_service(client, token)
    slug = data["business"]["slug"]
    monday = upcoming_weekday(MONDAY)

    response = client.post(
        f"/b/{slug}/book",
        json={
            "service_id": service["id"],
            "starts_at": f"{monday}T09:00:00",
            "name": "Ana",
            "email": "ana@example.com",
            "phone": "123",
        },
    )
    assert response.status_code == 400


def test_other_businesss_booking_does_not_block_this_businesss_slot(client):
    business_a = register_business(client, email="a@example.com", business_name="Studio A")
    business_b = register_business(client, email="b@example.com", business_name="Studio B")
    service_a = create_service(client, business_a["access_token"])
    service_b = create_service(client, business_b["access_token"])
    monday = upcoming_weekday(MONDAY)

    booking_payload = {
        "starts_at": f"{monday}T09:00:00",
        "name": "Ana",
        "email": "ana@example.com",
    }
    first = client.post(
        f"/b/{business_a['business']['slug']}/book",
        json={**booking_payload, "service_id": service_a["id"]},
    )
    assert first.status_code == 201

    second = client.post(
        f"/b/{business_b['business']['slug']}/book",
        json={**booking_payload, "service_id": service_b["id"]},
    )
    assert second.status_code == 201


def test_confirmed_booking_sends_confirmation_message(client, capsys):
    data = register_business(client)
    token = data["access_token"]
    service = create_service(client, token)
    slug = data["business"]["slug"]
    monday = upcoming_weekday(MONDAY)

    client.post(
        f"/b/{slug}/book",
        json={
            "service_id": service["id"],
            "starts_at": f"{monday}T09:00:00",
            "name": "Ana",
            "email": "ana@example.com",
        },
    )
    captured = capsys.readouterr().out
    assert "[stub-email]" in captured
    assert "is confirmed" in captured


def test_repeated_bookings_from_one_email_stop_sending_messages_past_the_cap(client, capsys):
    """The public /book endpoint has no verification-code rate limit to lean on
    when a business doesn't require verification -- this is its own cap, to
    stop a script from spamming a client's inbox with junk confirmations."""
    data = register_business(client)
    token = data["access_token"]
    service = create_service(client, token, duration_minutes=15)
    slug = data["business"]["slug"]
    monday = upcoming_weekday(MONDAY)

    capsys.readouterr()
    for hour in range(9, 16):  # 7 bookings, one per hour, same email
        response = client.post(
            f"/b/{slug}/book",
            json={
                "service_id": service["id"],
                "starts_at": f"{monday}T{hour:02d}:00:00",
                "name": "Ana",
                "email": "ana@example.com",
            },
        )
        assert response.status_code == 201, response.get_json()

    captured = capsys.readouterr().out
    sent_count = captured.count("[stub-email]")
    assert sent_count == EMAIL_DAILY_MAX  # the 6th and 7th are capped


def test_sixth_booking_from_one_email_is_flagged_and_held_pending(client):
    """Open booking_mode normally auto-confirms every booking -- but an email
    that's already booked 5 times today at this business gets its next
    booking forced to pending + flagged instead, so a script can't silently
    fill the calendar with auto-confirmed junk."""
    data = register_business(client)
    token = data["access_token"]
    service = create_service(client, token, duration_minutes=15)
    slug = data["business"]["slug"]
    monday = upcoming_weekday(MONDAY)

    bookings = []
    for hour in range(9, 16):  # 7 bookings, same email, open mode
        response = client.post(
            f"/b/{slug}/book",
            json={
                "service_id": service["id"],
                "starts_at": f"{monday}T{hour:02d}:00:00",
                "name": "Ana",
                "email": "ana@example.com",
            },
        )
        assert response.status_code == 201, response.get_json()
        bookings.append(response.get_json())

    # first 5 auto-confirm normally; the 6th and 7th get held for review
    assert [b["status"] for b in bookings[:5]] == ["confirmed"] * 5
    assert bookings[5]["status"] == "pending"
    assert bookings[6]["status"] == "pending"

    appointments = client.get(
        f"/appointments?date_from={monday}&date_to={monday}", headers=auth_headers(token)
    ).get_json()
    flagged = [a for a in appointments if a["flagged_for_review"]]
    assert len(flagged) == 2


def test_booking_from_one_ip_with_different_emails_is_flagged_past_the_cap(client):
    data = register_business(client)
    token = data["access_token"]
    service = create_service(client, token, duration_minutes=15)
    slug = data["business"]["slug"]
    monday = upcoming_weekday(MONDAY)

    bookings = []
    for hour in range(9, 16):  # 7 bookings, 7 different emails, same IP
        response = client.post(
            f"/b/{slug}/book",
            json={
                "service_id": service["id"],
                "starts_at": f"{monday}T{hour:02d}:00:00",
                "name": "Client",
                "email": f"client{hour}@example.com",
            },
            environ_overrides={"REMOTE_ADDR": "203.0.113.7"},
        )
        assert response.status_code == 201, response.get_json()
        bookings.append(response.get_json())

    assert [b["status"] for b in bookings[:5]] == ["confirmed"] * 5
    assert bookings[5]["status"] == "pending"
    assert bookings[6]["status"] == "pending"


def test_booking_under_the_caps_is_never_flagged(client):
    data = register_business(client)
    token = data["access_token"]
    service = create_service(client, token)
    slug = data["business"]["slug"]
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
    assert response.get_json()["status"] == "confirmed"

    appointments = client.get(
        f"/appointments?date_from={monday}&date_to={monday}", headers=auth_headers(token)
    ).get_json()
    assert appointments[0]["flagged_for_review"] is False


def test_pending_booking_sends_request_received_message(client, capsys):
    data = register_business(client)
    token = data["access_token"]
    client.patch(
        "/me/business", headers=auth_headers(token), json={"booking_mode": "approve_every"}
    )
    service = create_service(client, token)
    slug = data["business"]["slug"]
    monday = upcoming_weekday(MONDAY)

    client.post(
        f"/b/{slug}/book",
        json={
            "service_id": service["id"],
            "starts_at": f"{monday}T09:00:00",
            "name": "Ana",
            "email": "ana@example.com",
        },
    )
    captured = capsys.readouterr().out
    assert "[stub-email]" in captured
    assert "you'll be contacted once it's approved" in captured


def test_book_stores_phone_only_when_business_collects_it(client):
    data = register_business(client)
    token = data["access_token"]
    service = create_service(client, token)
    slug = data["business"]["slug"]
    monday = upcoming_weekday(MONDAY)

    client.post(
        f"/b/{slug}/book",
        json={
            "service_id": service["id"],
            "starts_at": f"{monday}T09:00:00",
            "name": "Ana",
            "email": "ana@example.com",
            "phone": "+38970123456",
        },
    )
    clients = client.get("/clients", headers=auth_headers(token)).get_json()
    assert clients[0]["phone_e164"] is None  # business hasn't opted in to collecting it

    client.patch("/me/business", headers=auth_headers(token), json={"collect_phone": True})
    client.post(
        f"/b/{slug}/book",
        json={
            "service_id": service["id"],
            "starts_at": f"{monday}T10:00:00",
            "name": "Ana",
            "email": "ana@example.com",
            "phone": "+38970123456",
        },
    )
    clients_after = client.get("/clients", headers=auth_headers(token)).get_json()
    assert clients_after[0]["phone_e164"] == "+38970123456"
