from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from . import rules
from .models import Employee, LeaveRequest
from .serializers import (
    BalanceSerializer,
    DecisionSerializer,
    LeaveRequestSerializer,
    LoginSerializer,
    MeSerializer,
    TeamRequestSerializer,
)


def current_employee(request):
    try:
        return request.user.employee
    except Employee.DoesNotExist:
        raise PermissionDenied("Your account has no employee profile.")


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(request, **serializer.validated_data)
        if user is None or not hasattr(user, "employee"):
            return Response(
                {"non_field_errors": ["Invalid username or password."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        auth_login(request, user)
        return Response(MeSerializer(user.employee).data)


class LogoutView(APIView):
    def post(self, request):
        auth_logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    def get(self, request):
        return Response(MeSerializer(current_employee(request)).data)


ALREADY_DECIDED = "This request has already been decided."


class MyRequestsView(APIView):
    def get(self, request):
        employee = current_employee(request)
        requests = (
            employee.leave_requests.select_related("employee__user", "decided_by__user")
            .order_by("-start_date", "-id")[:200]
        )
        return Response(LeaveRequestSerializer(requests, many=True).data)

    def post(self, request):
        employee = current_employee(request)
        serializer = LeaveRequestSerializer(data=request.data, context={"employee": employee})
        serializer.is_valid(raise_exception=True)
        leave_request = serializer.save()
        return Response(LeaveRequestSerializer(leave_request).data, status=status.HTTP_201_CREATED)


class CancelRequestView(APIView):
    def post(self, request, pk):
        employee = current_employee(request)
        leave_request = get_object_or_404(LeaveRequest, pk=pk, employee=employee)
        updated = LeaveRequest.objects.filter(
            pk=leave_request.pk, status=LeaveRequest.Status.PENDING
        ).update(status=LeaveRequest.Status.CANCELLED)
        if not updated:
            return Response({"detail": ALREADY_DECIDED}, status=status.HTTP_409_CONFLICT)
        leave_request.refresh_from_db()
        return Response(LeaveRequestSerializer(leave_request).data)


class BalanceView(APIView):
    def get(self, request):
        employee = current_employee(request)
        try:
            year = int(request.query_params.get("year", timezone.localdate().year))
        except ValueError:
            return Response({"year": ["Year must be a number."]}, status=status.HTTP_400_BAD_REQUEST)
        data = {"year": year, **rules.balance(employee, year)}
        return Response(BalanceSerializer(data).data)


class TeamRequestsView(APIView):
    def get(self, request):
        manager = current_employee(request)
        status_filter = request.query_params.get("status", LeaveRequest.Status.PENDING)
        if status_filter not in LeaveRequest.Status.values:
            return Response(
                {"status": [f"Status must be one of {', '.join(LeaveRequest.Status.values)}."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        requests = (
            LeaveRequest.objects.filter(employee__manager=manager, status=status_filter)
            .select_related("employee__user", "decided_by__user")
            .order_by("start_date", "id")[:200]
        )
        return Response(TeamRequestSerializer(requests, many=True).data)


class DecisionView(APIView):
    """Approve or reject a direct report's pending request. First decision wins."""

    new_status = None
    comment_required = False

    def post(self, request, pk):
        manager = current_employee(request)
        leave_request = get_object_or_404(LeaveRequest, pk=pk, employee__manager=manager)
        serializer = DecisionSerializer(data=request.data, comment_required=self.comment_required)
        serializer.is_valid(raise_exception=True)

        updated = LeaveRequest.objects.filter(
            pk=leave_request.pk, status=LeaveRequest.Status.PENDING
        ).update(
            status=self.new_status,
            decision_comment=serializer.validated_data["comment"].strip(),
            decided_by=manager,
            decided_at=timezone.now(),
        )
        if not updated:
            return Response({"detail": ALREADY_DECIDED}, status=status.HTTP_409_CONFLICT)
        leave_request.refresh_from_db()
        return Response(LeaveRequestSerializer(leave_request).data)


class ApproveView(DecisionView):
    new_status = LeaveRequest.Status.APPROVED


class RejectView(DecisionView):
    new_status = LeaveRequest.Status.REJECTED
    comment_required = True
