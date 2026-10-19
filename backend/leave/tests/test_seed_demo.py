import pytest
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.core.management import call_command

from leave.models import Employee

pytestmark = pytest.mark.django_db


def test_seed_demo_creates_team():
    call_command("seed_demo")

    for username in ["maya", "rina", "tom", "sam"]:
        assert authenticate(username=username, password="demo1234") is not None

    maya = Employee.objects.get(user__username="maya")
    assert Employee.objects.get(user__username="rina").manager == maya
    assert Employee.objects.get(user__username="tom").manager == maya
    assert Employee.objects.get(user__username="sam").manager is None


def test_seed_demo_is_idempotent():
    call_command("seed_demo")
    call_command("seed_demo")
    assert User.objects.filter(username__in=["maya", "rina", "tom", "sam"]).count() == 4
    assert Employee.objects.count() == 4
