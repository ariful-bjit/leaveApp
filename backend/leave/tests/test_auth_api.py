import pytest
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


def test_csrf_sets_cookie():
    response = APIClient().get("/api/auth/csrf")
    assert response.status_code == 204
    assert "csrftoken" in response.cookies


def test_login_with_valid_credentials_returns_me(team):
    client = APIClient()
    response = client.post("/api/auth/login", {"username": "rina", "password": "pw"}, format="json")
    assert response.status_code == 200
    assert response.json() == {
        "id": team["rina"].id,
        "name": "Rina Das",
        "username": "rina",
        "has_manager": True,
        "is_manager": False,
    }
    assert client.get("/api/auth/me").status_code == 200


def test_login_with_invalid_credentials_returns_400(team):
    response = APIClient().post(
        "/api/auth/login", {"username": "rina", "password": "wrong"}, format="json"
    )
    assert response.status_code == 400
    assert response.json() == {"non_field_errors": ["Invalid username or password."]}


def test_login_enforces_csrf(team):
    client = APIClient(enforce_csrf_checks=True)
    response = client.post("/api/auth/login", {"username": "rina", "password": "pw"}, format="json")
    assert response.status_code == 403


def test_me_requires_sign_in():
    assert APIClient().get("/api/auth/me").status_code == 403


def test_me_reports_manager_flags(team, client_for):
    maya = client_for(team["maya"]).get("/api/auth/me").json()
    assert maya["is_manager"] is True
    assert maya["has_manager"] is False

    sam = client_for(team["sam"]).get("/api/auth/me").json()
    assert sam["has_manager"] is False
    assert sam["is_manager"] is False


def test_logout_ends_session(team, client_for):
    client = client_for(team["rina"])
    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/auth/me").status_code == 403
