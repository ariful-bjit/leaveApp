from datetime import date

import pytest
from django.utils import timezone

pytestmark = pytest.mark.django_db


def test_balance_defaults_to_current_year(team, client_for, make_request):
    year = timezone.localdate().year
    make_request(team["rina"], date(year, 1, 5), date(year, 1, 9), status="APPROVED")  # Mon–Fri
    make_request(team["rina"], date(year, 1, 13), duration="HALF_DAY", half="MORNING")

    response = client_for(team["rina"]).get("/api/balance")

    assert response.status_code == 200
    assert response.json() == {
        "year": year,
        "allowance": "20.0",
        "used": "5.0",
        "pending": "0.5",
        "remaining": "15.0",
        "available": "14.5",
    }


def test_balance_for_another_year(team, client_for, make_request):
    next_year = timezone.localdate().year + 1
    make_request(team["rina"], date(next_year, 3, 2), status="APPROVED")

    body = client_for(team["rina"]).get(f"/api/balance?year={next_year}").json()

    assert body["year"] == next_year
    assert body["used"] == "1.0"


def test_invalid_year_is_rejected(team, client_for):
    response = client_for(team["rina"]).get("/api/balance?year=abc")
    assert response.status_code == 400


def test_balance_requires_sign_in():
    from rest_framework.test import APIClient

    assert APIClient().get("/api/balance").status_code == 403
