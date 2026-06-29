from app.extensions import db
from app.models import User
from tests.conftest import auth_headers, register_business


def make_admin(app, email):
    with app.app_context():
        user = User.query.filter_by(email=email).first()
        user.is_platform_admin = True
        db.session.commit()


def test_overview_requires_admin(client):
    data = register_business(client, plan_id="basic")
    response = client.get("/admin/overview", headers=auth_headers(data["access_token"]))
    assert response.status_code == 403


def test_overview_requires_auth(client):
    response = client.get("/admin/overview")
    assert response.status_code == 401


def test_overview_returns_aggregate_data(client, app):
    basic = register_business(client, email="a@example.com", business_name="A", plan_id="basic")
    register_business(client, email="b@example.com", business_name="B", plan_id="top")
    register_business(client, email="c@example.com", business_name="C", plan_id=None)
    make_admin(app, "a@example.com")

    response = client.get("/admin/overview", headers=auth_headers(basic["access_token"]))
    assert response.status_code == 200
    body = response.get_json()
    assert body["total_businesses"] == 3
    assert body["by_subscription_status"]["active"] == 2
    assert body["by_subscription_status"]["none"] == 1
    assert body["active_by_plan"] == {"basic": 1, "top": 1}
    assert body["mrr_eur"] == 9 + 39
    assert len(body["recent_businesses"]) == 3
