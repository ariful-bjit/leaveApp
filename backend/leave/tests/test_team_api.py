from datetime import timedelta
from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from leave.models import LeaveRequest
from leave.rules import balance

pytestmark = pytest.mark.django_db

ALREADY_DECIDED = {"detail": "This request has already been decided."}


@pytest.fixture
def maya_client(team, client_for):
    return client_for(team["maya"])


class TestList:
    def test_lists_pending_requests_of_direct_reports_only(self, maya_client, team, make_request,
                                                           next_monday):
        rina_req = make_request(team["rina"], next_monday, next_monday + timedelta(days=4))
        tom_req = make_request(team["tom"], next_monday + timedelta(days=7))
        make_request(team["tom"], next_monday + timedelta(days=14), status="APPROVED")
        make_request(team["sam"], next_monday)  # not a report

        body = maya_client.get("/api/team/requests").json()

        assert sorted(r["id"] for r in body) == sorted([rina_req.id, tom_req.id])
        rina_row = next(r for r in body if r["id"] == rina_req.id)
        assert rina_row["employee"] == {"id": team["rina"].id, "name": "Rina Das"}
        assert rina_row["employee_balance"] == {
            "year": next_monday.year,
            "allowance": "20.0",
            "used": "0.0",
            "pending": "5.0",
            "remaining": "20.0",
            "available": "15.0",
        }

    def test_status_filter(self, maya_client, team, make_request, next_monday):
        make_request(team["rina"], next_monday)
        approved = make_request(team["rina"], next_monday + timedelta(days=7), status="APPROVED")

        body = maya_client.get("/api/team/requests?status=APPROVED").json()
        assert [r["id"] for r in body] == [approved.id]

    def test_invalid_status_filter_is_rejected(self, maya_client):
        assert maya_client.get("/api/team/requests?status=NOPE").status_code == 400

    def test_non_manager_gets_empty_list(self, team, client_for, make_request, next_monday):
        make_request(team["rina"], next_monday)
        response = client_for(team["tom"]).get("/api/team/requests")
        assert response.status_code == 200
        assert response.json() == []

    def test_requires_sign_in(self):
        assert APIClient().get("/api/team/requests").status_code == 403


class TestApprove:
    def test_approve_sets_decision_and_uses_balance(self, maya_client, team, make_request,
                                                    next_monday):
        request = make_request(team["rina"], next_monday, next_monday + timedelta(days=4))

        response = maya_client.post(f"/api/team/requests/{request.id}/approve",
                                    {"comment": "Enjoy"}, format="json")

        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "APPROVED"
        assert body["decision_comment"] == "Enjoy"
        assert body["decided_by"] == {"id": team["maya"].id, "name": "Maya Rahman"}
        assert body["decided_at"] is not None
        assert balance(team["rina"], next_monday.year)["used"] == Decimal("5")

    def test_approve_comment_is_optional(self, maya_client, team, make_request, next_monday):
        request = make_request(team["rina"], next_monday)
        response = maya_client.post(f"/api/team/requests/{request.id}/approve")
        assert response.status_code == 200
        assert response.json()["decision_comment"] == ""


class TestReject:
    def test_reject_with_comment_leaves_balance_unchanged(self, maya_client, team, make_request,
                                                          next_monday):
        request = make_request(team["rina"], next_monday)

        response = maya_client.post(f"/api/team/requests/{request.id}/reject",
                                    {"comment": "Release week"}, format="json")

        assert response.status_code == 200
        assert response.json()["status"] == "REJECTED"
        assert response.json()["decision_comment"] == "Release week"
        result = balance(team["rina"], next_monday.year)
        assert result["used"] == 0
        assert result["pending"] == 0

    @pytest.mark.parametrize("body", [{}, {"comment": ""}, {"comment": "   "}])
    def test_reject_requires_comment(self, maya_client, team, make_request, next_monday, body):
        request = make_request(team["rina"], next_monday)
        response = maya_client.post(f"/api/team/requests/{request.id}/reject", body, format="json")

        assert response.status_code == 400
        assert "comment" in response.json()
        request.refresh_from_db()
        assert request.status == "PENDING"


class TestDecisionRules:
    @pytest.mark.parametrize("action", ["approve", "reject"])
    def test_comment_over_500_chars_is_rejected(self, maya_client, team, make_request, next_monday,
                                                action):
        request = make_request(team["rina"], next_monday)
        response = maya_client.post(f"/api/team/requests/{request.id}/{action}",
                                    {"comment": "x" * 501}, format="json")
        assert response.status_code == 400

    @pytest.mark.parametrize("who", ["sam", "maya"])
    def test_cannot_decide_request_of_non_report(self, maya_client, team, make_request,
                                                 next_monday, who):
        request = make_request(team[who], next_monday)  # includes the manager's own request
        response = maya_client.post(f"/api/team/requests/{request.id}/approve")
        assert response.status_code == 404

    def test_report_cannot_decide_peer_request(self, team, client_for, make_request, next_monday):
        request = make_request(team["rina"], next_monday)
        response = client_for(team["tom"]).post(f"/api/team/requests/{request.id}/approve")
        assert response.status_code == 404

    @pytest.mark.parametrize("status", ["APPROVED", "REJECTED", "CANCELLED"])
    @pytest.mark.parametrize("action", ["approve", "reject"])
    def test_cannot_decide_twice(self, maya_client, team, make_request, next_monday, status, action):
        request = make_request(team["rina"], next_monday, status=status)
        response = maya_client.post(f"/api/team/requests/{request.id}/{action}",
                                    {"comment": "Late"}, format="json")

        assert response.status_code == 409
        assert response.json() == ALREADY_DECIDED
        request.refresh_from_db()
        assert request.status == status

    def test_second_of_two_decisions_conflicts(self, maya_client, team, make_request, next_monday):
        request = make_request(team["rina"], next_monday)
        first = maya_client.post(f"/api/team/requests/{request.id}/approve")
        second = maya_client.post(f"/api/team/requests/{request.id}/reject",
                                  {"comment": "Changed my mind"}, format="json")

        assert first.status_code == 200
        assert second.status_code == 409
        assert LeaveRequest.objects.get(pk=request.pk).status == "APPROVED"
