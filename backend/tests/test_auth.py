import re

from tests.conftest import register_business


def test_register_creates_business_with_slug_and_default_hours(client):
    data = register_business(client)
    assert data["business"]["slug"] == "studio-linija"
    assert "access_token" in data
    assert "refresh_token" in data

    hours = client.get(
        "/working-hours", headers={"Authorization": f"Bearer {data['access_token']}"}
    ).get_json()
    assert len(hours) == 7
    sunday = next(h for h in hours if h["weekday"] == 6)
    assert sunday["is_closed"] is True


def test_register_duplicate_email_fails(client):
    register_business(client)
    response = client.post(
        "/auth/register",
        json={"email": "owner@example.com", "password": "password123", "business_name": "Other"},
    )
    assert response.status_code == 409


def test_register_weak_password_fails(client):
    response = client.post(
        "/auth/register",
        json={"email": "a@b.com", "password": "short", "business_name": "Studio"},
    )
    assert response.status_code == 400
    assert "password" in response.get_json()["errors"]


def test_duplicate_business_name_gets_unique_slug(client):
    register_business(client, email="a@example.com", business_name="Studio Linija")
    second = register_business(client, email="b@example.com", business_name="Studio Linija")
    assert second["business"]["slug"] == "studio-linija-2"


def test_login_success(client):
    register_business(client)
    credentials = {"email": "owner@example.com", "password": "password123"}
    response = client.post("/auth/login", json=credentials)
    assert response.status_code == 200
    assert "access_token" in response.get_json()


def test_login_wrong_password_fails(client):
    register_business(client)
    credentials = {"email": "owner@example.com", "password": "wrongpass"}
    response = client.post("/auth/login", json=credentials)
    assert response.status_code == 401


def test_refresh_returns_new_access_token(client):
    data = register_business(client)
    response = client.post("/auth/refresh", json={"refresh_token": data["refresh_token"]})
    assert response.status_code == 200
    assert "access_token" in response.get_json()


def test_refresh_rejects_access_token(client):
    data = register_business(client)
    response = client.post("/auth/refresh", json={"refresh_token": data["access_token"]})
    assert response.status_code == 401


def test_register_sends_welcome_email(client, capsys):
    register_business(client)
    captured = capsys.readouterr()
    assert "[stub-email]" in captured.out
    assert "owner@example.com" in captured.out


def test_login_locks_out_after_too_many_failed_attempts(client):
    register_business(client)
    credentials = {"email": "owner@example.com", "password": "wrongpass"}

    for _ in range(5):
        response = client.post("/auth/login", json=credentials)
        assert response.status_code == 401

    locked = client.post(
        "/auth/login", json={"email": "owner@example.com", "password": "password123"}
    )
    assert locked.status_code == 429


def test_successful_login_resets_attempt_counter(client):
    register_business(client)
    wrong = {"email": "owner@example.com", "password": "wrongpass"}
    for _ in range(3):
        client.post("/auth/login", json=wrong)

    right = client.post(
        "/auth/login", json={"email": "owner@example.com", "password": "password123"}
    )
    assert right.status_code == 200

    # attempts reset, so 3 more wrong guesses shouldn't trip the 5-attempt lock
    for _ in range(3):
        response = client.post("/auth/login", json=wrong)
        assert response.status_code == 401


def test_password_reset_flow(client, capsys):
    register_business(client)

    request_resp = client.post("/auth/password-reset/request", json={"email": "owner@example.com"})
    assert request_resp.status_code == 200
    captured = capsys.readouterr().out
    match = re.search(r"token=([\w\-.]+)", captured)
    assert match, captured
    token = match.group(1)

    confirm = client.post(
        "/auth/password-reset/confirm", json={"token": token, "new_password": "newpassword123"}
    )
    assert confirm.status_code == 200

    old_login = client.post(
        "/auth/login", json={"email": "owner@example.com", "password": "password123"}
    )
    assert old_login.status_code == 401

    new_login = client.post(
        "/auth/login", json={"email": "owner@example.com", "password": "newpassword123"}
    )
    assert new_login.status_code == 200


def test_password_reset_token_is_single_use(client, capsys):
    register_business(client)
    client.post("/auth/password-reset/request", json={"email": "owner@example.com"})
    token = re.search(r"token=([\w\-.]+)", capsys.readouterr().out).group(1)

    first = client.post(
        "/auth/password-reset/confirm", json={"token": token, "new_password": "newpassword123"}
    )
    assert first.status_code == 200

    second = client.post(
        "/auth/password-reset/confirm", json={"token": token, "new_password": "anotherpass456"}
    )
    assert second.status_code == 400


def test_password_reset_request_does_not_leak_whether_email_exists(client):
    response = client.post("/auth/password-reset/request", json={"email": "nobody@example.com"})
    assert response.status_code == 200
    assert "reset link has been sent" in response.get_json()["message"]


def test_password_reset_confirm_rejects_invalid_token(client):
    register_business(client)
    response = client.post(
        "/auth/password-reset/confirm",
        json={"token": "not-a-real-token", "new_password": "newpassword123"},
    )
    assert response.status_code == 400


def test_password_reset_request_is_rate_limited(client, capsys):
    register_business(client)

    first = client.post("/auth/password-reset/request", json={"email": "owner@example.com"})
    assert first.status_code == 200
    assert "[stub-email]" in capsys.readouterr().out

    # Same generic message either way -- but no second email actually goes out
    # within the cooldown window, so this can't be used to email-bomb someone.
    second = client.post("/auth/password-reset/request", json={"email": "owner@example.com"})
    assert second.status_code == 200
    assert "[stub-email]" not in capsys.readouterr().out
