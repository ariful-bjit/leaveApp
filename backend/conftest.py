from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.test import APIClient

from leave.models import Employee, LeaveRequest


@pytest.fixture(autouse=True)
def fast_password_hasher(settings):
    settings.PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]


@pytest.fixture
def make_employee(db):
    def _make(username, manager=None, allowance=20, first_name="", last_name=""):
        user = User.objects.create_user(
            username=username, password="pw", first_name=first_name, last_name=last_name
        )
        return Employee.objects.create(
            user=user, manager=manager, annual_allowance=Decimal(str(allowance))
        )

    return _make


@pytest.fixture
def client_for():
    def _client(employee):
        client = APIClient()
        client.force_login(employee.user)
        return client

    return _client


@pytest.fixture
def team(make_employee):
    maya = make_employee("maya", first_name="Maya", last_name="Rahman")
    rina = make_employee("rina", manager=maya, first_name="Rina", last_name="Das")
    tom = make_employee("tom", manager=maya, first_name="Tom", last_name="Khan")
    sam = make_employee("sam", first_name="Sam", last_name="Ali")
    return {"maya": maya, "rina": rina, "tom": tom, "sam": sam}


@pytest.fixture
def make_request(db):
    """Insert a LeaveRequest directly (bypassing API validation) for test setup."""

    def _make(employee, start, end=None, status="PENDING", duration="FULL_DAY", half=None, days=None):
        from leave.rules import compute_working_days

        end = end or start
        return LeaveRequest.objects.create(
            employee=employee,
            start_date=start,
            end_date=end,
            duration=duration,
            half=half,
            status=status,
            working_days=days if days is not None else compute_working_days(duration, start, end),
        )

    return _make


@pytest.fixture
def next_monday():
    today = timezone.localdate()
    return today + timedelta(days=7 - today.weekday())
