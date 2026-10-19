"""Business rules for leave requests: working days, overlaps and balances.

Pure functions where possible so they can be unit-tested without HTTP.
"""

from datetime import timedelta
from decimal import Decimal

from django.db.models import Sum

HALF_DAY = "HALF_DAY"
FULL_DAY = "FULL_DAY"
ACTIVE_STATUSES = ("PENDING", "APPROVED")


def count_working_days(start, end):
    """Number of Monday–Friday dates in [start, end]; 0 if end is before start."""
    days = 0
    current = start
    while current <= end:
        if current.weekday() < 5:
            days += 1
        current += timedelta(days=1)
    return days


def compute_working_days(duration, start, end):
    if duration == HALF_DAY:
        return Decimal("0.5")
    return Decimal(count_working_days(start, end))


def overlaps(a, b):
    """True if two requests share a date, except Morning vs Afternoon half days on the same date."""
    if a.start_date > b.end_date or b.start_date > a.end_date:
        return False
    both_half_days = a.duration == HALF_DAY and b.duration == HALF_DAY
    if both_half_days and a.start_date == b.start_date and a.half != b.half:
        return False
    return True


def balance(employee, year):
    requests = employee.leave_requests.filter(start_date__year=year)

    def total(status):
        return requests.filter(status=status).aggregate(s=Sum("working_days"))["s"] or Decimal("0")

    allowance = employee.annual_allowance
    used = total("APPROVED")
    pending = total("PENDING")
    remaining = allowance - used
    return {
        "allowance": allowance,
        "used": used,
        "pending": pending,
        "remaining": remaining,
        "available": remaining - pending,
    }


def format_days(value):
    """Decimal day count for messages: 5 → "5", 4.5 → "4.5"."""
    text = f"{value:.1f}"
    return text[:-2] if text.endswith(".0") else text
