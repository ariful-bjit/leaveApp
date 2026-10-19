import pytest
from django.contrib.auth.models import User
from django.test import Client

pytestmark = pytest.mark.django_db

ADMIN_PAGES = [
    "/admin/leave/employee/",
    "/admin/leave/employee/add/",
    "/admin/leave/leaverequest/",
    "/admin/leave/leaverequest/add/",
]


@pytest.mark.parametrize("url", ADMIN_PAGES)
def test_superuser_can_open_admin_pages(team, make_request, next_monday, url):
    make_request(team["rina"], next_monday)  # so list pages render a row
    admin = User.objects.create_superuser("admin", "admin@example.com", "pw")
    client = Client()
    client.force_login(admin)

    assert client.get(url).status_code == 200


def test_demo_user_is_sent_to_admin_login(team):
    client = Client()
    client.force_login(team["rina"].user)

    response = client.get("/admin/leave/leaverequest/")

    assert response.status_code == 302
    assert response.url.startswith("/admin/login/")
