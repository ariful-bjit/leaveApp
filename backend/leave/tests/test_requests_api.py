from datetime import date, timedelta

import pytest
from django.utils import timezone

from leave.models import LeaveRequest

pytestmark = pytest.mark.django_db

ALREADY_DECIDED = {"detail": "This request has already been decided."}


def messages(response):
    """All error messages in a 400 response, flattened."""
    return [m for value in response.json().values() for m in value]


@pytest.fixture
def rina_client(team, client_for):
    return client_for(team["rina"])


def post(client, **body):
    return client.post("/api/requests", body, format="json")


class TestCreate:
    def test_full_week_creates_pending_request(self, rina_client, next_monday, team):
        friday = next_monday + timedelta(days=4)
        response = post(rina_client, start_date=next_monday, end_date=friday, reason="Holiday")

        assert response.status_code == 201
        body = response.json()
        assert body["working_days"] == "5.0"
        assert body["status"] == "PENDING"
        assert body["duration"] == "FULL_DAY"
        assert body["half"] is None
        assert body["employee"] == {"id": team["rina"].id, "name": "Rina Das"}
        assert body["decided_by"] is None

    def test_half_day_counts_half(self, rina_client, next_monday):
        tuesday = next_monday + timedelta(days=1)
        response = post(rina_client, start_date=tuesday, end_date=tuesday,
                        duration="HALF_DAY", half="MORNING")

        assert response.status_code == 201
        assert response.json()["working_days"] == "0.5"
        assert response.json()["half"] == "MORNING"

    def test_full_day_ignores_half(self, rina_client, next_monday):
        response = post(rina_client, start_date=next_monday, end_date=next_monday, half="MORNING")
        assert response.status_code == 201
        assert response.json()["half"] is None

    def test_morning_and_afternoon_same_date_both_accepted(self, rina_client, next_monday):
        tuesday = next_monday + timedelta(days=1)
        first = post(rina_client, start_date=tuesday, end_date=tuesday, duration="HALF_DAY", half="MORNING")
        second = post(rina_client, start_date=tuesday, end_date=tuesday, duration="HALF_DAY", half="AFTERNOON")
        assert first.status_code == 201
        assert second.status_code == 201

        full = post(rina_client, start_date=tuesday, end_date=tuesday)
        assert full.status_code == 400
        assert "This request overlaps another pending or approved request." in messages(full)

    @pytest.mark.parametrize(
        "case, expected",
        [
            ("end_before_start", "End date must be on or after the start date."),
            ("past_start", "Start date cannot be in the past."),
            ("weekend_only", "The selected dates contain no working days (Monday–Friday)."),
            ("half_day_saturday", "A half day must be on a working day (Monday–Friday)."),
            ("half_day_two_dates", "A half-day request must start and end on the same date."),
            ("half_day_without_half", "Choose Morning or Afternoon for a half-day request."),
            ("crosses_year", "A request cannot span two calendar years. Please split it at 31 December."),
        ],
    )
    def test_invalid_dates_are_rejected(self, rina_client, next_monday, case, expected):
        saturday = next_monday + timedelta(days=5)
        next_year = timezone.localdate().year + 1
        bodies = {
            "end_before_start": dict(start_date=next_monday + timedelta(days=2), end_date=next_monday),
            "past_start": dict(start_date=timezone.localdate() - timedelta(days=1),
                               end_date=next_monday),
            "weekend_only": dict(start_date=saturday, end_date=saturday + timedelta(days=1)),
            "half_day_saturday": dict(start_date=saturday, end_date=saturday,
                                      duration="HALF_DAY", half="MORNING"),
            "half_day_two_dates": dict(start_date=next_monday, end_date=next_monday + timedelta(days=1),
                                       duration="HALF_DAY", half="MORNING"),
            "half_day_without_half": dict(start_date=next_monday, end_date=next_monday,
                                          duration="HALF_DAY"),
            "crosses_year": dict(start_date=date(next_year, 12, 30), end_date=date(next_year + 1, 1, 4)),
        }
        response = post(rina_client, **bodies[case])

        assert response.status_code == 400
        assert expected in messages(response)
        assert LeaveRequest.objects.count() == 0

    @pytest.mark.parametrize("status", ["PENDING", "APPROVED"])
    def test_overlap_with_active_request_is_rejected(self, rina_client, team, make_request,
                                                     next_monday, status):
        make_request(team["rina"], next_monday, next_monday + timedelta(days=2), status=status)
        response = post(rina_client, start_date=next_monday + timedelta(days=2),
                        end_date=next_monday + timedelta(days=3))

        assert response.status_code == 400
        assert "This request overlaps another pending or approved request." in messages(response)

    @pytest.mark.parametrize("status", ["CANCELLED", "REJECTED"])
    def test_overlap_with_inactive_request_is_allowed(self, rina_client, team, make_request,
                                                      next_monday, status):
        make_request(team["rina"], next_monday, status=status)
        response = post(rina_client, start_date=next_monday, end_date=next_monday)
        assert response.status_code == 201

    def test_more_days_than_available_is_rejected(self, make_employee, client_for, team, make_request,
                                                  next_monday):
        lee = make_employee("lee", manager=team["maya"], allowance=6)
        make_request(lee, next_monday + timedelta(days=14), status="APPROVED")  # 1 used
        make_request(lee, next_monday + timedelta(days=21))  # 1 pending → 4 available
        client = client_for(lee)

        response = post(client, start_date=next_monday, end_date=next_monday + timedelta(days=4))
        assert response.status_code == 400
        assert "This request needs 5 days but only 4 are available." in messages(response)

        ok = post(client, start_date=next_monday, end_date=next_monday + timedelta(days=3))
        assert ok.status_code == 201

    def test_half_day_allowed_with_exactly_half_available(self, make_employee, client_for, team,
                                                          next_monday):
        lee = make_employee("lee", manager=team["maya"], allowance=0.5)
        response = post(client_for(lee), start_date=next_monday, end_date=next_monday,
                        duration="HALF_DAY", half="AFTERNOON")
        assert response.status_code == 201

    def test_reason_over_500_chars_is_rejected(self, rina_client, next_monday):
        response = post(rina_client, start_date=next_monday, end_date=next_monday, reason="x" * 501)
        assert response.status_code == 400
        assert "reason" in response.json()

    def test_employee_without_manager_cannot_submit(self, team, client_for, next_monday):
        response = post(client_for(team["sam"]), start_date=next_monday, end_date=next_monday)
        assert response.status_code == 400
        assert "You have no manager assigned. Contact an administrator." in messages(response)

    def test_requires_sign_in(self, next_monday):
        from rest_framework.test import APIClient

        response = APIClient().post("/api/requests", {"start_date": next_monday}, format="json")
        assert response.status_code == 403


class TestList:
    def test_lists_only_own_requests_newest_start_first(self, rina_client, team, make_request,
                                                        next_monday):
        early = make_request(team["rina"], next_monday)
        late = make_request(team["rina"], next_monday + timedelta(days=7))
        make_request(team["tom"], next_monday)

        body = rina_client.get("/api/requests").json()
        assert [r["id"] for r in body] == [late.id, early.id]


class TestCancel:
    def test_cancels_own_pending_request(self, rina_client, team, make_request, next_monday):
        request = make_request(team["rina"], next_monday)
        response = rina_client.post(f"/api/requests/{request.id}/cancel")

        assert response.status_code == 200
        assert response.json()["status"] == "CANCELLED"
        request.refresh_from_db()
        assert request.status == "CANCELLED"

    @pytest.mark.parametrize("status", ["CANCELLED", "APPROVED", "REJECTED"])
    def test_cannot_cancel_decided_request(self, rina_client, team, make_request, next_monday, status):
        request = make_request(team["rina"], next_monday, status=status)
        response = rina_client.post(f"/api/requests/{request.id}/cancel")

        assert response.status_code == 409
        assert response.json() == ALREADY_DECIDED

    def test_cannot_cancel_someone_elses_request(self, rina_client, team, make_request, next_monday):
        request = make_request(team["tom"], next_monday)
        response = rina_client.post(f"/api/requests/{request.id}/cancel")

        assert response.status_code == 404
        request.refresh_from_db()
        assert request.status == "PENDING"
