from tests.conftest import auth_headers, register_business


def test_get_business_requires_auth(client):
    response = client.get("/me/business")
    assert response.status_code == 401


def test_patch_business_sets_type_and_prefills_services(client):
    data = register_business(client)
    headers = auth_headers(data["access_token"])

    response = client.patch("/me/business", headers=headers, json={"type_id": "barber"})
    assert response.status_code == 200
    body = response.get_json()
    assert body["type_id"] == "barber"
    assert body["vocab_key"] == "service"
    assert body["accent_key"] == "amber"

    services = client.get("/services", headers=headers).get_json()
    assert len(services) == 3
    assert services[0]["name"] == "Машко стрижење"


def test_onboarding_completed_at_set_on_final_step(client):
    data = register_business(client)
    headers = auth_headers(data["access_token"])

    midway = client.patch("/me/business", headers=headers, json={"onboarding_step": 3})
    assert midway.get_json()["onboarding_completed_at"] is None

    done = client.patch("/me/business", headers=headers, json={"onboarding_step": 6})
    assert done.get_json()["onboarding_completed_at"] is not None


def test_patch_business_rejects_unknown_type(client):
    data = register_business(client)
    headers = auth_headers(data["access_token"])
    response = client.patch("/me/business", headers=headers, json={"type_id": "not-a-type"})
    assert response.status_code == 400


def test_services_crud(client):
    data = register_business(client)
    headers = auth_headers(data["access_token"])

    create = client.post(
        "/services",
        headers=headers,
        json={"name": "Custom service", "duration_minutes": 30, "price": 500},
    )
    assert create.status_code == 201
    service_id = create.get_json()["id"]

    update = client.patch(
        f"/services/{service_id}", headers=headers, json={"price": 600, "active": False}
    )
    assert update.status_code == 200
    assert update.get_json()["price"] == 600
    assert update.get_json()["active"] is False

    delete = client.delete(f"/services/{service_id}", headers=headers)
    assert delete.status_code == 204

    services = client.get("/services", headers=headers).get_json()
    assert services == []


def test_working_hours_put_updates_all_days(client):
    data = register_business(client)
    headers = auth_headers(data["access_token"])

    hours = client.get("/working-hours", headers=headers).get_json()
    for hour in hours:
        hour["slot_minutes"] = 15

    response = client.put("/working-hours", headers=headers, json={"hours": hours})
    assert response.status_code == 200
    assert all(h["slot_minutes"] == 15 for h in response.get_json())


def test_working_hours_put_requires_all_seven_days(client):
    data = register_business(client)
    headers = auth_headers(data["access_token"])

    single_day = {"weekday": 0, "open_minute": 540, "close_minute": 1020, "slot_minutes": 30}
    response = client.put("/working-hours", headers=headers, json={"hours": [single_day]})
    assert response.status_code == 400
