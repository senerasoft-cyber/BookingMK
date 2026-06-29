import io

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


def book(client, slug, service_id, starts_at, email="ana@example.com", name="Ana"):
    response = client.post(
        f"/b/{slug}/book",
        json={"service_id": service_id, "starts_at": starts_at, "name": name, "email": email},
    )
    assert response.status_code == 201, response.get_json()
    return response.get_json()


def setup_with_appointment(client, booking_mode="open"):
    data = register_business(client)
    token = data["access_token"]
    client.patch("/me/business", headers=auth_headers(token), json={"booking_mode": booking_mode})
    service = create_service(client, token)
    slug = data["business"]["slug"]
    monday = upcoming_weekday(MONDAY)
    starts_at = f"{monday}T09:00:00"
    booking = book(client, slug, service["id"], starts_at)
    return token, slug, service, booking, starts_at


def test_list_appointments_filters_by_status(client):
    token, slug, service, _booking, monday_slot = setup_with_appointment(
        client, booking_mode="approve_every"
    )
    book(
        client, slug, service["id"], monday_slot.replace("09:00", "10:00"), email="bob@example.com"
    )

    pending = client.get("/appointments?status=pending", headers=auth_headers(token)).get_json()
    confirmed = client.get("/appointments?status=confirmed", headers=auth_headers(token)).get_json()
    assert len(pending) == 2
    assert confirmed == []


def test_list_appointments_filters_by_date_range(client):
    token, _slug, _service, _booking, monday_slot = setup_with_appointment(client)
    day = monday_slot.split("T")[0]

    in_range = client.get(
        f"/appointments?date_from={day}&date_to={day}", headers=auth_headers(token)
    ).get_json()
    out_of_range = client.get(
        "/appointments?date_from=2000-01-01&date_to=2000-01-02", headers=auth_headers(token)
    ).get_json()
    assert len(in_range) == 1
    assert out_of_range == []


def test_appointments_require_auth(client):
    response = client.get("/appointments")
    assert response.status_code == 401


def test_approve_appointment_confirms_and_approves_client(client):
    token, _slug, _service, booking, _slot = setup_with_appointment(
        client, booking_mode="approved_clients"
    )

    response = client.post(f"/appointments/{booking['id']}/approve", headers=auth_headers(token))
    assert response.status_code == 200
    body = response.get_json()
    assert body["status"] == "confirmed"
    assert body["client"]["is_approved"] is True


def test_approve_appointment_does_not_auto_approve_client_in_approve_every(client):
    token, _slug, _service, booking, _slot = setup_with_appointment(
        client, booking_mode="approve_every"
    )

    response = client.post(f"/appointments/{booking['id']}/approve", headers=auth_headers(token))
    body = response.get_json()
    assert body["status"] == "confirmed"
    assert body["client"]["is_approved"] is False


def test_cancel_appointment_frees_the_slot(client):
    token, slug, service, booking, slot = setup_with_appointment(client)

    cancel = client.post(f"/appointments/{booking['id']}/cancel", headers=auth_headers(token))
    assert cancel.get_json()["status"] == "cancelled"

    rebooked = book(client, slug, service["id"], slot, email="bob@example.com", name="Bob")
    assert rebooked["status"] == "confirmed"


def test_appointments_are_tenant_isolated(client):
    token_a, _slug_a, _service_a, booking_a, _slot = setup_with_appointment(client)
    data_b = register_business(client, email="b@example.com", business_name="Studio B")
    token_b = data_b["access_token"]

    response = client.post(
        f"/appointments/{booking_a['id']}/approve", headers=auth_headers(token_b)
    )
    assert response.status_code == 404

    listing = client.get("/appointments", headers=auth_headers(token_b)).get_json()
    assert listing == []


def test_list_create_and_approve_clients(client):
    data = register_business(client)
    token = data["access_token"]

    create = client.post(
        "/clients",
        headers=auth_headers(token),
        json={"name": "Marko", "phone": "+38971555444", "is_approved": False},
    )
    assert create.status_code == 201
    client_id = create.get_json()["id"]
    assert create.get_json()["is_approved"] is False

    listing = client.get("/clients", headers=auth_headers(token)).get_json()
    assert len(listing) == 1

    approve = client.post(f"/clients/{client_id}/approve", headers=auth_headers(token))
    assert approve.get_json()["is_approved"] is True

    unapprove = client.post(f"/clients/{client_id}/unapprove", headers=auth_headers(token))
    assert unapprove.get_json()["is_approved"] is False


def test_create_client_duplicate_email_conflicts(client):
    data = register_business(client)
    token = data["access_token"]
    payload = {"name": "Marko", "email": "marko@example.com"}

    first = client.post("/clients", headers=auth_headers(token), json=payload)
    assert first.status_code == 201
    second = client.post("/clients", headers=auth_headers(token), json=payload)
    assert second.status_code == 409


def test_create_client_duplicate_phone_is_allowed(client):
    """Phone is info-only now, not a unique identity -- two genuinely
    different clients (e.g. a shared family phone) shouldn't collide."""
    data = register_business(client)
    token = data["access_token"]

    first = client.post(
        "/clients", headers=auth_headers(token), json={"name": "Marko", "phone": "+38971555444"}
    )
    assert first.status_code == 201
    second = client.post(
        "/clients", headers=auth_headers(token), json={"name": "Ana", "phone": "+38971555444"}
    )
    assert second.status_code == 201


def test_create_client_with_name_only_is_allowed(client):
    """Manual client entry is the owner's own discretion -- no verification
    involved, so neither email nor phone is actually required."""
    data = register_business(client)
    token = data["access_token"]

    response = client.post("/clients", headers=auth_headers(token), json={"name": "Marko"})
    assert response.status_code == 201


def test_clients_are_tenant_isolated(client):
    data_a = register_business(client, email="a@example.com", business_name="Studio A")
    data_b = register_business(client, email="b@example.com", business_name="Studio B")
    client.post(
        "/clients",
        headers=auth_headers(data_a["access_token"]),
        json={"name": "Marko", "phone": "+38971555444"},
    )

    listing_b = client.get("/clients", headers=auth_headers(data_b["access_token"])).get_json()
    assert listing_b == []


def test_upload_logo_sets_business_logo_url(client):
    data = register_business(client)
    token = data["access_token"]

    response = client.post(
        "/uploads",
        headers=auth_headers(token),
        data={"kind": "logo", "file": (io.BytesIO(b"fake-png-bytes"), "logo.png")},
        content_type="multipart/form-data",
    )
    assert response.status_code == 201, response.get_json()
    logo_url = response.get_json()["logo_url"]
    assert logo_url is not None

    served = client.get(logo_url.replace("http://localhost:5000", ""))
    assert served.status_code == 200
    assert served.data == b"fake-png-bytes"


def test_upload_rejects_unsupported_extension(client):
    data = register_business(client)
    token = data["access_token"]

    response = client.post(
        "/uploads",
        headers=auth_headers(token),
        data={"kind": "cover", "file": (io.BytesIO(b"not-an-image"), "cover.exe")},
        content_type="multipart/form-data",
    )
    assert response.status_code == 400


def test_upload_requires_auth(client):
    response = client.post(
        "/uploads",
        data={"kind": "logo", "file": (io.BytesIO(b"x"), "logo.png")},
        content_type="multipart/form-data",
    )
    assert response.status_code == 401
