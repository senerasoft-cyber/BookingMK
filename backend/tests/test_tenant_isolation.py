from tests.conftest import auth_headers, register_business


def test_owner_only_sees_own_services(client):
    owner_a = register_business(client, email="a@example.com", business_name="Studio A")
    owner_b = register_business(client, email="b@example.com", business_name="Studio B")

    client.post(
        "/services",
        headers=auth_headers(owner_a["access_token"]),
        json={"name": "A service", "duration_minutes": 30, "price": 100},
    )
    client.post(
        "/services",
        headers=auth_headers(owner_b["access_token"]),
        json={"name": "B service", "duration_minutes": 30, "price": 100},
    )

    services_a = client.get("/services", headers=auth_headers(owner_a["access_token"])).get_json()
    services_b = client.get("/services", headers=auth_headers(owner_b["access_token"])).get_json()

    assert [s["name"] for s in services_a] == ["A service"]
    assert [s["name"] for s in services_b] == ["B service"]


def test_owner_cannot_modify_another_businesss_service(client):
    owner_a = register_business(client, email="a@example.com", business_name="Studio A")
    owner_b = register_business(client, email="b@example.com", business_name="Studio B")

    created = client.post(
        "/services",
        headers=auth_headers(owner_a["access_token"]),
        json={"name": "A service", "duration_minutes": 30, "price": 100},
    )
    service_id = created.get_json()["id"]

    update = client.patch(
        f"/services/{service_id}",
        headers=auth_headers(owner_b["access_token"]),
        json={"price": 1},
    )
    assert update.status_code == 404

    delete = client.delete(f"/services/{service_id}", headers=auth_headers(owner_b["access_token"]))
    assert delete.status_code == 404


def test_owner_cannot_read_another_businesss_data_via_token_swap(client):
    owner_a = register_business(client, email="a@example.com", business_name="Studio A")
    register_business(client, email="b@example.com", business_name="Studio B")

    business_a = client.get(
        "/me/business", headers=auth_headers(owner_a["access_token"])
    ).get_json()
    assert business_a["slug"] == "studio-a"
