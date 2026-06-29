import re

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


def book_and_get_manage_token(client, capsys, slug, service_id, starts_at, email="ana@example.com"):
    capsys.readouterr()
    response = client.post(
        "/b/" + slug + "/book",
        json={
            "service_id": service_id,
            "starts_at": starts_at,
            "name": "Ana",
            "email": email,
        },
    )
    assert response.status_code == 201, response.get_json()
    appointment_id = response.get_json()["id"]
    out = capsys.readouterr().out
    match = re.search(r"/manage/([\w.\-]+)", out)
    assert match, out
    return appointment_id, match.group(1)


def test_get_managed_appointment(client, capsys):
    data = register_business(client)
    token = data["access_token"]
    service = create_service(client, token)
    slug = data["business"]["slug"]
    monday = upcoming_weekday(MONDAY)

    _appt_id, manage_token = book_and_get_manage_token(
        client, capsys, slug, service["id"], f"{monday}T09:00:00"
    )

    response = client.get(f"/b/{slug}/manage/{manage_token}")
    assert response.status_code == 200
    body = response.get_json()
    assert body["service_name"] == "Haircut"
    assert body["status"] == "confirmed"


def test_get_managed_appointment_rejects_invalid_token(client):
    data = register_business(client)
    slug = data["business"]["slug"]

    response = client.get(f"/b/{slug}/manage/not-a-real-token")
    assert response.status_code == 401


def test_cancel_managed_appointment(client, capsys):
    data = register_business(client)
    token = data["access_token"]
    service = create_service(client, token)
    slug = data["business"]["slug"]
    monday = upcoming_weekday(MONDAY)

    _appt_id, manage_token = book_and_get_manage_token(
        client, capsys, slug, service["id"], f"{monday}T09:00:00"
    )

    response = client.post(f"/b/{slug}/manage/{manage_token}/cancel")
    assert response.status_code == 200
    assert response.get_json()["status"] == "cancelled"

    # freed slot should be bookable again
    second = client.post(
        f"/b/{slug}/book",
        json={
            "service_id": service["id"],
            "starts_at": f"{monday}T09:00:00",
            "name": "Bob",
            "email": "bob@example.com",
        },
    )
    assert second.status_code == 201


def test_move_managed_appointment(client, capsys):
    data = register_business(client)
    token = data["access_token"]
    service = create_service(client, token)
    slug = data["business"]["slug"]
    monday = upcoming_weekday(MONDAY)

    _appt_id, manage_token = book_and_get_manage_token(
        client, capsys, slug, service["id"], f"{monday}T09:00:00"
    )

    response = client.post(
        f"/b/{slug}/manage/{manage_token}/move", json={"starts_at": f"{monday}T10:00:00"}
    )
    assert response.status_code == 200
    assert response.get_json()["starts_at"] == f"{monday}T10:00:00"


def test_move_managed_appointment_rejects_taken_slot(client, capsys):
    data = register_business(client)
    token = data["access_token"]
    service = create_service(client, token)
    slug = data["business"]["slug"]
    monday = upcoming_weekday(MONDAY)

    _appt_id, manage_token = book_and_get_manage_token(
        client, capsys, slug, service["id"], f"{monday}T09:00:00"
    )
    client.post(
        f"/b/{slug}/book",
        json={
            "service_id": service["id"],
            "starts_at": f"{monday}T10:00:00",
            "name": "Bob",
            "email": "bob@example.com",
        },
    )

    response = client.post(
        f"/b/{slug}/manage/{manage_token}/move", json={"starts_at": f"{monday}T10:00:00"}
    )
    assert response.status_code == 409


def test_cannot_manage_another_businesss_appointment(client, capsys):
    data_a = register_business(client, email="a@example.com", business_name="Studio A")
    data_b = register_business(client, email="b@example.com", business_name="Studio B")
    service_a = create_service(client, data_a["access_token"])
    monday = upcoming_weekday(MONDAY)

    _appt_id, manage_token = book_and_get_manage_token(
        client, capsys, data_a["business"]["slug"], service_a["id"], f"{monday}T09:00:00"
    )

    response = client.get(f"/b/{data_b['business']['slug']}/manage/{manage_token}")
    assert response.status_code == 404
