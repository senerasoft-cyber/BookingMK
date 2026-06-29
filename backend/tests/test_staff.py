import io

from tests.conftest import auth_headers, register_business, upcoming_weekday

MONDAY = 0
TUESDAY = 1


def create_service(client, token, name="Haircut", duration_minutes=30, price=400, staff_id=None):
    body = {"name": name, "duration_minutes": duration_minutes, "price": price}
    if staff_id is not None:
        body["staff_id"] = staff_id
    response = client.post("/services", headers=auth_headers(token), json=body)
    assert response.status_code == 201, response.get_json()
    return response.get_json()


def create_staff(client, token, name="Specialist"):
    response = client.post("/staff", headers=auth_headers(token), json={"name": name})
    assert response.status_code == 201, response.get_json()
    return response.get_json()


def book(client, slug, service_id, starts_at, email="ana@example.com", name="Ana"):
    return client.post(
        f"/b/{slug}/book",
        json={"service_id": service_id, "starts_at": starts_at, "name": name, "email": email},
    )


def test_register_creates_one_default_staff_member(client):
    data = register_business(client)
    token = data["access_token"]

    staff = client.get("/staff", headers=auth_headers(token)).get_json()
    assert len(staff) == 1
    assert staff[0]["name"] == "Owner"
    assert staff[0]["pin_set"] is False


def test_default_services_and_hours_resolve_to_solo_staff(client):
    data = register_business(client)
    token = data["access_token"]
    staff = client.get("/staff", headers=auth_headers(token)).get_json()
    service = create_service(client, token)

    services = client.get("/services", headers=auth_headers(token)).get_json()
    assert services[0]["staff_id"] == staff[0]["id"]
    assert service["staff_id"] == staff[0]["id"]


def test_create_staff_member_gets_independent_default_hours(client):
    data = register_business(client)
    token = data["access_token"]
    new_staff = create_staff(client, token, name="Second Barber")

    hours = client.get(
        f"/staff/{new_staff['id']}/working-hours", headers=auth_headers(token)
    ).get_json()
    assert len(hours) == 7
    monday = next(h for h in hours if h["weekday"] == MONDAY)
    assert monday["open_minute"] == 540 and monday["close_minute"] == 1020


def test_delete_last_staff_member_is_blocked(client):
    data = register_business(client)
    token = data["access_token"]
    staff = client.get("/staff", headers=auth_headers(token)).get_json()

    response = client.delete(f"/staff/{staff[0]['id']}", headers=auth_headers(token))
    assert response.status_code == 409


def test_delete_staff_member_succeeds_when_others_remain(client):
    data = register_business(client)
    token = data["access_token"]
    new_staff = create_staff(client, token)

    response = client.delete(f"/staff/{new_staff['id']}", headers=auth_headers(token))
    assert response.status_code == 204


def test_services_are_independent_per_staff(client):
    data = register_business(client)
    token = data["access_token"]
    owner_staff = client.get("/staff", headers=auth_headers(token)).get_json()[0]
    second_staff = create_staff(client, token)

    create_service(client, token, name="Owner's cut", staff_id=owner_staff["id"])
    create_service(client, token, name="Second's cut", staff_id=second_staff["id"])

    owner_services = client.get(
        f"/services?staff_id={owner_staff['id']}", headers=auth_headers(token)
    ).get_json()
    second_services = client.get(
        f"/services?staff_id={second_staff['id']}", headers=auth_headers(token)
    ).get_json()
    assert [s["name"] for s in owner_services] == ["Owner's cut"]
    assert [s["name"] for s in second_services] == ["Second's cut"]


def test_staff_working_hours_are_independent(client):
    data = register_business(client)
    token = data["access_token"]
    owner_staff = client.get("/staff", headers=auth_headers(token)).get_json()[0]
    second_staff = create_staff(client, token)

    hours = client.get(
        f"/staff/{second_staff['id']}/working-hours", headers=auth_headers(token)
    ).get_json()
    for hour in hours:
        if hour["weekday"] == MONDAY:
            hour["is_closed"] = True
    client.put(
        f"/staff/{second_staff['id']}/working-hours",
        headers=auth_headers(token),
        json={"hours": hours},
    )

    owner_service = create_service(client, token, name="Owner cut", staff_id=owner_staff["id"])
    second_service = create_service(client, token, name="Second cut", staff_id=second_staff["id"])
    slug = data["business"]["slug"]
    monday = upcoming_weekday(MONDAY)

    owner_avail = client.get(
        f"/b/{slug}/availability?service_id={owner_service['id']}&date={monday}"
    ).get_json()
    second_avail = client.get(
        f"/b/{slug}/availability?service_id={second_service['id']}&date={monday}"
    ).get_json()
    assert owner_avail["slots"] != []
    assert second_avail["slots"] == []


def test_two_staff_can_be_booked_at_the_same_business_wide_timestamp(client):
    data = register_business(client)
    token = data["access_token"]
    owner_staff = client.get("/staff", headers=auth_headers(token)).get_json()[0]
    second_staff = create_staff(client, token)
    owner_service = create_service(client, token, name="Owner cut", staff_id=owner_staff["id"])
    second_service = create_service(client, token, name="Second cut", staff_id=second_staff["id"])
    slug = data["business"]["slug"]
    monday = f"{upcoming_weekday(MONDAY)}T09:00:00"

    first = book(client, slug, owner_service["id"], monday, email="ana@example.com", name="Ana")
    second = book(client, slug, second_service["id"], monday, email="bob@example.com", name="Bob")
    assert first.status_code == 201
    assert second.status_code == 201


def test_public_business_lists_staff_and_omits_services_when_multi_staff(client):
    data = register_business(client)
    token = data["access_token"]
    create_staff(client, token)
    slug = data["business"]["slug"]

    body = client.get(f"/b/{slug}").get_json()
    assert len(body["staff"]) == 2
    assert body["services"] == []


def test_public_staff_services_endpoint_returns_only_that_staffs_services(client):
    data = register_business(client)
    token = data["access_token"]
    owner_staff = client.get("/staff", headers=auth_headers(token)).get_json()[0]
    second_staff = create_staff(client, token)
    create_service(client, token, name="Owner cut", staff_id=owner_staff["id"])
    create_service(client, token, name="Second cut", staff_id=second_staff["id"])
    slug = data["business"]["slug"]

    response = client.get(f"/b/{slug}/staff/{second_staff['id']}/services")
    assert [s["name"] for s in response.get_json()] == ["Second cut"]


def test_set_staff_pin_then_verify(client):
    """The dashboard is one shared login -- a staff PIN is just an optional
    speed bump when switching into that persona, set/verified entirely under
    the owner's own JWT (see app/blueprints/owner.py)."""
    data = register_business(client)
    token = data["access_token"]
    staff = client.get("/staff", headers=auth_headers(token)).get_json()[0]
    headers = auth_headers(token)

    setup = client.patch(
        f"/staff/{staff['id']}/pin", headers=headers, json={"pin": "1234", "confirm_pin": "1234"}
    )
    assert setup.status_code == 200
    assert setup.get_json()["pin_set"] is True

    wrong = client.post(f"/staff/{staff['id']}/pin/verify", headers=headers, json={"pin": "9999"})
    assert wrong.status_code == 400

    right = client.post(f"/staff/{staff['id']}/pin/verify", headers=headers, json={"pin": "1234"})
    assert right.status_code == 200
    assert right.get_json()["verified"] is True


def test_set_staff_pin_rejects_mismatched_confirmation(client):
    data = register_business(client)
    token = data["access_token"]
    staff = client.get("/staff", headers=auth_headers(token)).get_json()[0]

    response = client.patch(
        f"/staff/{staff['id']}/pin",
        headers=auth_headers(token),
        json={"pin": "1234", "confirm_pin": "4321"},
    )
    assert response.status_code == 400


def test_verify_staff_pin_locks_out_after_too_many_failed_attempts(client):
    data = register_business(client)
    token = data["access_token"]
    staff = client.get("/staff", headers=auth_headers(token)).get_json()[0]
    headers = auth_headers(token)
    client.patch(
        f"/staff/{staff['id']}/pin", headers=headers, json={"pin": "1234", "confirm_pin": "1234"}
    )

    for _ in range(5):
        response = client.post(
            f"/staff/{staff['id']}/pin/verify", headers=headers, json={"pin": "0000"}
        )
        assert response.status_code == 400

    locked = client.post(f"/staff/{staff['id']}/pin/verify", headers=headers, json={"pin": "1234"})
    assert locked.status_code == 429


def test_reset_pin_clears_it_for_setup_again(client):
    data = register_business(client)
    token = data["access_token"]
    staff = client.get("/staff", headers=auth_headers(token)).get_json()[0]
    headers = auth_headers(token)
    client.patch(
        f"/staff/{staff['id']}/pin", headers=headers, json={"pin": "1234", "confirm_pin": "1234"}
    )

    reset = client.post(f"/staff/{staff['id']}/reset-pin", headers=headers)
    assert reset.get_json()["pin_set"] is False

    setup_again = client.patch(
        f"/staff/{staff['id']}/pin", headers=headers, json={"pin": "5678", "confirm_pin": "5678"}
    )
    assert setup_again.status_code == 200


def test_owner_manual_booking_requires_client_info(client):
    data = register_business(client)
    token = data["access_token"]
    service = create_service(client, token)
    monday = f"{upcoming_weekday(MONDAY)}T09:00:00"

    response = client.post(
        "/appointments",
        headers=auth_headers(token),
        json={"service_id": service["id"], "starts_at": monday},
    )
    assert response.status_code == 400


def test_owner_manual_booking_creates_confirmed_appointment(client):
    data = register_business(client)
    token = data["access_token"]
    service = create_service(client, token)
    monday = f"{upcoming_weekday(MONDAY)}T23:00:00"  # well outside default hours

    response = client.post(
        "/appointments",
        headers=auth_headers(token),
        json={
            "service_id": service["id"],
            "starts_at": monday,
            "name": "Walk-in Wendy",
            "phone": "+38970555444",
        },
    )
    assert response.status_code == 201, response.get_json()
    body = response.get_json()
    assert body["status"] == "confirmed"
    assert body["source"] == "owner_manual"


def test_owner_move_appointment_bypasses_working_hours(client):
    data = register_business(client)
    token = data["access_token"]
    service = create_service(client, token)
    slug = data["business"]["slug"]
    monday = f"{upcoming_weekday(MONDAY)}T09:00:00"
    booking = book(client, slug, service["id"], monday).get_json()

    late_night = f"{upcoming_weekday(MONDAY)}T23:30:00"
    response = client.post(
        f"/appointments/{booking['id']}/move",
        headers=auth_headers(token),
        json={"starts_at": late_night},
    )
    assert response.status_code == 200
    assert response.get_json()["starts_at"] == late_night


def test_owner_move_appointment_still_blocks_exact_same_staff_double_booking(client):
    data = register_business(client)
    token = data["access_token"]
    service = create_service(client, token)
    slug = data["business"]["slug"]
    monday = upcoming_weekday(MONDAY)
    book(client, slug, service["id"], f"{monday}T09:00:00", email="ana@example.com")
    second = book(
        client, slug, service["id"], f"{monday}T10:00:00", email="bob@example.com"
    ).get_json()

    response = client.post(
        f"/appointments/{second['id']}/move",
        headers=auth_headers(token),
        json={"starts_at": f"{monday}T09:00:00"},
    )
    assert response.status_code == 409


def test_owner_move_with_notify_sends_message(client, capsys):
    data = register_business(client)
    token = data["access_token"]
    service = create_service(client, token)
    slug = data["business"]["slug"]
    monday = upcoming_weekday(MONDAY)
    booking = book(client, slug, service["id"], f"{monday}T09:00:00").get_json()

    client.post(
        f"/appointments/{booking['id']}/move",
        headers=auth_headers(token),
        json={"starts_at": f"{monday}T11:00:00", "notify_client": True},
    )
    captured = capsys.readouterr()
    assert "[stub-email]" in captured.out
    assert "moved" in captured.out


def test_owner_cancel_with_notify_sends_message(client, capsys):
    data = register_business(client)
    token = data["access_token"]
    service = create_service(client, token)
    slug = data["business"]["slug"]
    monday = upcoming_weekday(MONDAY)
    booking = book(client, slug, service["id"], f"{monday}T09:00:00").get_json()

    client.post(
        f"/appointments/{booking['id']}/cancel",
        headers=auth_headers(token),
        json={"notify_client": True},
    )
    captured = capsys.readouterr()
    assert "[stub-email]" in captured.out
    assert "cancelled" in captured.out


def test_create_staff_can_copy_services_from_existing_staff(client):
    data = register_business(client)
    token = data["access_token"]
    owner_staff = client.get("/staff", headers=auth_headers(token)).get_json()[0]
    create_service(client, token, name="Haircut", price=500, staff_id=owner_staff["id"])
    create_service(client, token, name="Shave", price=300, staff_id=owner_staff["id"])

    response = client.post(
        "/staff",
        headers=auth_headers(token),
        json={"name": "New hire", "copy_services_from": owner_staff["id"]},
    )
    assert response.status_code == 201
    new_staff_id = response.get_json()["id"]

    copied = client.get(
        f"/services?staff_id={new_staff_id}", headers=auth_headers(token)
    ).get_json()
    assert sorted(s["name"] for s in copied) == ["Haircut", "Shave"]
    assert all(s["staff_id"] == new_staff_id for s in copied)

    # the source staff's own services are untouched
    original = client.get(
        f"/services?staff_id={owner_staff['id']}", headers=auth_headers(token)
    ).get_json()
    assert len(original) == 2


def test_create_staff_rejects_invalid_copy_source(client):
    data = register_business(client)
    token = data["access_token"]

    response = client.post(
        "/staff",
        headers=auth_headers(token),
        json={"name": "New hire", "copy_services_from": 99999},
    )
    assert response.status_code == 400


def test_staff_time_off_blocks_availability(client):
    data = register_business(client)
    token = data["access_token"]
    slug = data["business"]["slug"]
    owner_staff = client.get("/staff", headers=auth_headers(token)).get_json()[0]
    service = create_service(client, token, name="Haircut", price=500, staff_id=owner_staff["id"])
    monday = upcoming_weekday(MONDAY)

    before = client.get(
        f"/b/{slug}/availability?service_id={service['id']}&date={monday}"
    ).get_json()
    assert len(before["slots"]) > 0

    created = client.post(
        f"/staff/{owner_staff['id']}/time-off",
        headers=auth_headers(token),
        json={"start_date": str(monday), "end_date": str(monday), "note": "Vacation"},
    )
    assert created.status_code == 201
    time_off_id = created.get_json()["id"]

    listing = client.get(
        f"/staff/{owner_staff['id']}/time-off", headers=auth_headers(token)
    ).get_json()
    assert len(listing) == 1

    after = client.get(
        f"/b/{slug}/availability?service_id={service['id']}&date={monday}"
    ).get_json()
    assert after["slots"] == []

    deleted = client.delete(
        f"/staff/{owner_staff['id']}/time-off/{time_off_id}", headers=auth_headers(token)
    )
    assert deleted.status_code == 204

    restored = client.get(
        f"/b/{slug}/availability?service_id={service['id']}&date={monday}"
    ).get_json()
    assert len(restored["slots"]) > 0


def test_staff_time_off_rejects_end_before_start(client):
    data = register_business(client)
    token = data["access_token"]
    owner_staff = client.get("/staff", headers=auth_headers(token)).get_json()[0]

    response = client.post(
        f"/staff/{owner_staff['id']}/time-off",
        headers=auth_headers(token),
        json={"start_date": "2026-08-10", "end_date": "2026-08-01"},
    )
    assert response.status_code == 400


def test_upload_staff_photo(client):
    data = register_business(client)
    token = data["access_token"]
    owner_staff = client.get("/staff", headers=auth_headers(token)).get_json()[0]

    response = client.post(
        "/uploads",
        headers=auth_headers(token),
        data={
            "kind": "staff_photo",
            "staff_id": str(owner_staff["id"]),
            "file": (io.BytesIO(b"fake-image-bytes"), "photo.png"),
        },
        content_type="multipart/form-data",
    )
    assert response.status_code == 201
    body = response.get_json()
    assert body["photo_url"] is not None

    staff = client.get("/staff", headers=auth_headers(token)).get_json()
    assert staff[0]["photo_url"] == body["photo_url"]


def test_upload_staff_photo_rejects_other_business_staff(client):
    data_a = register_business(client, email="a@example.com", business_name="A")
    data_b = register_business(client, email="b@example.com", business_name="B")
    other_staff = client.get("/staff", headers=auth_headers(data_b["access_token"])).get_json()[0]

    response = client.post(
        "/uploads",
        headers=auth_headers(data_a["access_token"]),
        data={
            "kind": "staff_photo",
            "staff_id": str(other_staff["id"]),
            "file": (io.BytesIO(b"fake-image-bytes"), "photo.png"),
        },
        content_type="multipart/form-data",
    )
    assert response.status_code == 400


def test_appointments_list_filters_by_staff_id(client):
    data = register_business(client)
    token = data["access_token"]
    owner_staff = client.get("/staff", headers=auth_headers(token)).get_json()[0]
    second_staff = create_staff(client, token)
    owner_service = create_service(client, token, name="Owner cut", staff_id=owner_staff["id"])
    second_service = create_service(client, token, name="Second cut", staff_id=second_staff["id"])
    slug = data["business"]["slug"]
    monday = f"{upcoming_weekday(MONDAY)}T09:00:00"
    book(client, slug, owner_service["id"], monday, email="ana@example.com")
    book(client, slug, second_service["id"], monday, email="bob@example.com")

    only_second = client.get(
        f"/appointments?staff_id={second_staff['id']}", headers=auth_headers(token)
    ).get_json()
    assert len(only_second) == 1
    assert only_second[0]["staff_id"] == second_staff["id"]


def test_owner_pin_not_set_by_default(client):
    data = register_business(client)
    token = data["access_token"]
    business = client.get("/me/business", headers=auth_headers(token)).get_json()
    assert business["owner_pin_set"] is False


def test_owner_pin_set_then_verify(client):
    data = register_business(client)
    token = data["access_token"]
    headers = auth_headers(token)

    set_resp = client.patch("/me/pin", headers=headers, json={"pin": "5555", "confirm_pin": "5555"})
    assert set_resp.status_code == 200
    assert set_resp.get_json()["owner_pin_set"] is True

    wrong = client.post("/me/pin/verify", headers=headers, json={"pin": "0000"})
    assert wrong.status_code == 400

    right = client.post("/me/pin/verify", headers=headers, json={"pin": "5555"})
    assert right.status_code == 200
    assert right.get_json()["verified"] is True


def test_owner_pin_can_be_changed_without_reset_flow(client):
    data = register_business(client)
    token = data["access_token"]
    headers = auth_headers(token)
    client.patch("/me/pin", headers=headers, json={"pin": "1111", "confirm_pin": "1111"})
    client.patch("/me/pin", headers=headers, json={"pin": "2222", "confirm_pin": "2222"})

    response = client.post("/me/pin/verify", headers=headers, json={"pin": "2222"})
    assert response.status_code == 200


def test_owner_pin_locks_out_after_too_many_failed_attempts(client):
    data = register_business(client)
    token = data["access_token"]
    headers = auth_headers(token)
    client.patch("/me/pin", headers=headers, json={"pin": "1234", "confirm_pin": "1234"})

    for _ in range(5):
        response = client.post("/me/pin/verify", headers=headers, json={"pin": "0000"})
        assert response.status_code == 400

    locked = client.post("/me/pin/verify", headers=headers, json={"pin": "1234"})
    assert locked.status_code == 429


def test_owner_can_set_working_hours_for_a_specific_staff_member(client):
    """The dashboard's working-hours editor is staff_id-scoped under the
    owner's own JWT now -- there's no separate self-service staff login."""
    data = register_business(client)
    token = data["access_token"]
    headers = auth_headers(token)
    second_staff = create_staff(client, token)

    hours = client.get(f"/staff/{second_staff['id']}/working-hours", headers=headers).get_json()
    for hour in hours:
        hour["slot_minutes"] = 15
    response = client.put(
        f"/staff/{second_staff['id']}/working-hours", headers=headers, json={"hours": hours}
    )
    assert response.status_code == 200
    assert all(h["slot_minutes"] == 15 for h in response.get_json())
