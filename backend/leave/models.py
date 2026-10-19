from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models


class Employee(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="employee"
    )
    manager = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="direct_reports",
    )
    annual_allowance = models.DecimalField(
        max_digits=4,
        decimal_places=1,
        default=Decimal("20.0"),
        validators=[MinValueValidator(Decimal("0"))],
    )

    def clean(self):
        if self.manager_id is not None and self.manager_id == self.pk:
            raise ValidationError({"manager": "An employee cannot be their own manager."})
        if (self.annual_allowance * 2) % 1 != 0:
            raise ValidationError({"annual_allowance": "Allowance must be in 0.5-day steps."})

    @property
    def name(self):
        return self.user.get_full_name() or self.user.username

    @property
    def is_manager(self):
        return self.direct_reports.exists()

    def __str__(self):
        return self.name


class LeaveRequest(models.Model):
    class Duration(models.TextChoices):
        FULL_DAY = "FULL_DAY", "Full day"
        HALF_DAY = "HALF_DAY", "Half day"

    class Half(models.TextChoices):
        MORNING = "MORNING", "Morning"
        AFTERNOON = "AFTERNOON", "Afternoon"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        CANCELLED = "CANCELLED", "Cancelled"

    employee = models.ForeignKey(
        Employee, on_delete=models.CASCADE, related_name="leave_requests"
    )
    start_date = models.DateField()
    end_date = models.DateField()
    duration = models.CharField(
        max_length=8, choices=Duration.choices, default=Duration.FULL_DAY
    )
    half = models.CharField(max_length=9, choices=Half.choices, null=True, blank=True)
    working_days = models.DecimalField(max_digits=4, decimal_places=1)
    reason = models.TextField(max_length=500, blank=True)
    status = models.CharField(
        max_length=9, choices=Status.choices, default=Status.PENDING
    )
    decision_comment = models.TextField(max_length=500, blank=True)
    decided_by = models.ForeignKey(
        Employee,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="decisions",
    )
    decided_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["employee", "status"]),
            models.Index(fields=["employee", "start_date"]),
        ]

    def __str__(self):
        return f"{self.employee} {self.start_date}–{self.end_date} ({self.status})"
