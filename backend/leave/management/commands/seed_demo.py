from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction

from leave.models import Employee

PASSWORD = "demo1234"

# (username, first name, last name, manager username)
DEMO_PEOPLE = [
    ("maya", "Maya", "Rahman", None),
    ("rina", "Rina", "Das", "maya"),
    ("tom", "Tom", "Khan", "maya"),
    ("sam", "Sam", "Ali", None),
]


class Command(BaseCommand):
    help = f'Create demo users (password "{PASSWORD}"): maya manages rina and tom; sam has no manager.'

    @transaction.atomic
    def handle(self, *args, **options):
        employees = {}
        for username, first, last, manager in DEMO_PEOPLE:
            user, _ = User.objects.get_or_create(
                username=username, defaults={"first_name": first, "last_name": last}
            )
            user.set_password(PASSWORD)
            user.save()
            employee, _ = Employee.objects.get_or_create(user=user)
            employee.manager = employees.get(manager)
            employee.save()
            employees[username] = employee
        self.stdout.write(self.style.SUCCESS(f"Seeded {len(employees)} demo users."))
