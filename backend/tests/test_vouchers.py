from tests.conftest import auth_headers, register_business, upcoming_weekday

MONDAY = 0


def create_service(client, token, name="Haircut", duration_minutes=30, price=1000):
    response = client.post(
        "/services",
        headers=auth_headers(token),
        json={"name": name, "duration_minutes": duration_minutes, "price": price},
    )
    assert response.status_code == 201, response.get_json()
    return response.get_json()


def create_client_record(client, token, name="Ana", email="ana@example.com"):
    response = client.post(
        "/clients", headers=auth_headers(token), json={"name": name, "email": email}
    )
    assert response.status_code == 201, response.get_json()
    return response.get_json()


def enable_marketing(client, token, loyalty_every_n=None):
    body = {"marketing_enabled": True}
    if loyalty_every_n is not None:
        body["loyalty_enabled"] = True
        body["loyalty_every_n"] = loyalty_every_n
    response = client.patch("/me/business", headers=auth_headers(token), json=body)
    assert response.status_code == 200, response.get_json()
    return response.get_json()


def test_voucher_creation_requires_marketing_enabled(client):
    data = register_business(client, plan_id="mid")
    token = data["access_token"]
    cl = create_client_record(client, token)

    response = client.post(
        "/me/vouchers",
        headers=auth_headers(token),
        json={"client_id": cl["id"], "kind": "free"},
    )
    assert response.status_code == 402
    assert response.get_json()["error"] == "marketing_not_enabled"


def test_voucher_creation_requires_mid_plan(client):
    data = register_business(client, plan_id="basic")
    token = data["access_token"]
    enable_marketing(client, token)
    cl = create_client_record(client, token)

    response = client.post(
        "/me/vouchers",
        headers=auth_headers(token),
        json={"client_id": cl["id"], "kind": "free"},
    )
    assert response.status_code == 402
    assert response.get_json()["error"] == "plan_marketing_tools_not_allowed"


def test_grant_and_list_voucher(client):
    data = register_business(client, plan_id="mid")
    token = data["access_token"]
    enable_marketing(client, token)
    cl = create_client_record(client, token)

    created = client.post(
        "/me/vouchers",
        headers=auth_headers(token),
        json={"client_id": cl["id"], "kind": "percent_off", "percent_off": 15},
    )
    assert created.status_code == 201
    body = created.get_json()
    assert body["kind"] == "percent_off"
    assert body["percent_off"] == 15
    assert body["consumed_at"] is None
    assert body["client_name"] == "Ana"

    listing = client.get("/me/vouchers", headers=auth_headers(token)).get_json()
    assert len(listing) == 1


def test_percent_off_voucher_requires_percent_off_value(client):
    data = register_business(client, plan_id="mid")
    token = data["access_token"]
    enable_marketing(client, token)
    cl = create_client_record(client, token)

    response = client.post(
        "/me/vouchers",
        headers=auth_headers(token),
        json={"client_id": cl["id"], "kind": "percent_off"},
    )
    assert response.status_code == 400


def test_delete_unconsumed_voucher(client):
    data = register_business(client, plan_id="mid")
    token = data["access_token"]
    enable_marketing(client, token)
    cl = create_client_record(client, token)

    voucher = client.post(
        "/me/vouchers",
        headers=auth_headers(token),
        json={"client_id": cl["id"], "kind": "free"},
    ).get_json()

    deleted = client.delete(f"/me/vouchers/{voucher['id']}", headers=auth_headers(token))
    assert deleted.status_code == 204
    assert client.get("/me/vouchers", headers=auth_headers(token)).get_json() == []


def test_voucher_attached_to_clients_next_booking_and_consumed(client):
    data = register_business(client, plan_id="mid")
    token = data["access_token"]
    slug = data["business"]["slug"]
    enable_marketing(client, token)
    service = create_service(client, token)
    monday = upcoming_weekday(MONDAY)

    cl = create_client_record(client, token, name="Ana", email="ana@example.com")
    granted = client.post(
        "/me/vouchers",
        headers=auth_headers(token),
        json={"client_id": cl["id"], "kind": "percent_off", "percent_off": 20},
    ).get_json()

    booking = client.post(
        f"/b/{slug}/book",
        json={
            "service_id": service["id"],
            "starts_at": f"{monday}T09:00:00",
            "name": "Ana",
            "email": "ana@example.com",
        },
    )
    assert booking.status_code == 201

    appointments = client.get("/appointments", headers=auth_headers(token)).get_json()
    appt = next(a for a in appointments if a["id"] == booking.get_json()["id"])
    assert appt["voucher_code"] == granted["code"]
    # service_price is never auto-reduced -- the owner honors the voucher in person.
    assert appt["service_price"] == 1000.0

    vouchers = client.get("/me/vouchers", headers=auth_headers(token)).get_json()
    assert vouchers[0]["consumed_at"] is not None

    # A second booking by the same client has no more unconsumed vouchers to attach.
    second = client.post(
        f"/b/{slug}/book",
        json={
            "service_id": service["id"],
            "starts_at": f"{monday}T10:00:00",
            "name": "Ana",
            "email": "ana@example.com",
        },
    )
    assert second.status_code == 201
    appointments = client.get("/appointments", headers=auth_headers(token)).get_json()
    second_appt = next(a for a in appointments if a["id"] == second.get_json()["id"])
    assert second_appt["voucher_code"] is None


def test_voucher_not_attached_when_marketing_disabled(client):
    data = register_business(client, plan_id="mid")
    token = data["access_token"]
    slug = data["business"]["slug"]
    service = create_service(client, token)
    monday = upcoming_weekday(MONDAY)

    # Marketing is off by default, so even a (hypothetically) existing voucher
    # would never be looked up -- simplest proof is that booking just works
    # and nothing references vouchers.
    booking = client.post(
        f"/b/{slug}/book",
        json={
            "service_id": service["id"],
            "starts_at": f"{monday}T09:00:00",
            "name": "Ana",
            "email": "ana@example.com",
        },
    )
    assert booking.status_code == 201
    appt = client.get("/appointments", headers=auth_headers(token)).get_json()[0]
    assert appt["voucher_code"] is None


def test_loyalty_auto_grants_voucher_every_nth_booking(client, app):
    data = register_business(client, plan_id="mid")
    token = data["access_token"]
    slug = data["business"]["slug"]
    enable_marketing(client, token, loyalty_every_n=2)
    service = create_service(client, token)
    monday = upcoming_weekday(MONDAY)

    def make_booking(hour):
        return client.post(
            f"/b/{slug}/book",
            json={
                "service_id": service["id"],
                "starts_at": f"{monday}T{hour:02d}:00:00",
                "name": "Ana",
                "email": "ana@example.com",
            },
        )

    first = make_booking(9)
    assert first.status_code == 201
    assert client.get("/me/vouchers", headers=auth_headers(token)).get_json() == []

    second = make_booking(10)
    assert second.status_code == 201
    vouchers = client.get("/me/vouchers", headers=auth_headers(token)).get_json()
    assert len(vouchers) == 1
    assert vouchers[0]["kind"] == "free"
    assert vouchers[0]["source"] == "loyalty"
    assert vouchers[0]["consumed_at"] is None

    # That voucher is for this client's *next* visit, not the one that earned it.
    second_appt = client.get("/appointments", headers=auth_headers(token)).get_json()
    booked = next(a for a in second_appt if a["id"] == second.get_json()["id"])
    assert booked["voucher_code"] is None

    third = make_booking(11)
    assert third.status_code == 201
    third_appt = client.get("/appointments", headers=auth_headers(token)).get_json()
    booked_third = next(a for a in third_appt if a["id"] == third.get_json()["id"])
    assert booked_third["voucher_code"] == vouchers[0]["code"]
