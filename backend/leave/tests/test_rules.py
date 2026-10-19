from datetime import date, timedelta
from decimal import Decimal
from types import SimpleNamespace

import pytest

from leave.rules import balance, compute_working_days, count_working_days, overlaps

MON = date(2026, 11, 2)  # a Monday
TUE = MON + timedelta(days=1)
FRI = MON + timedelta(days=4)
SAT = MON + timedelta(days=5)
SUN = MON + timedelta(days=6)
NEXT_MON = MON + timedelta(days=7)


def req(start, end=None, duration="FULL_DAY", half=None):
    return SimpleNamespace(start_date=start, end_date=end or start, duration=duration, half=half)


class TestCountWorkingDays:
    def test_monday_to_friday_is_five(self):
        assert count_working_days(MON, FRI) == 5

    def test_friday_to_monday_skips_weekend(self):
        assert count_working_days(FRI, NEXT_MON) == 2

    def test_weekend_only_is_zero(self):
        assert count_working_days(SAT, SUN) == 0

    def test_end_before_start_is_zero(self):
        assert count_working_days(FRI, MON) == 0


class TestComputeWorkingDays:
    def test_full_day_counts_weekdays(self):
        assert compute_working_days("FULL_DAY", MON, FRI) == Decimal("5")

    def test_half_day_is_half(self):
        assert compute_working_days("HALF_DAY", TUE, TUE) == Decimal("0.5")


class TestOverlaps:
    def test_intersecting_ranges_overlap(self):
        assert overlaps(req(MON, FRI), req(FRI, NEXT_MON))

    def test_separate_ranges_do_not_overlap(self):
        assert not overlaps(req(MON, TUE), req(FRI))

    def test_morning_and_afternoon_on_same_date_do_not_overlap(self):
        assert not overlaps(req(TUE, duration="HALF_DAY", half="MORNING"),
                            req(TUE, duration="HALF_DAY", half="AFTERNOON"))

    def test_same_half_on_same_date_overlaps(self):
        assert overlaps(req(TUE, duration="HALF_DAY", half="MORNING"),
                        req(TUE, duration="HALF_DAY", half="MORNING"))

    def test_full_day_and_half_day_on_same_date_overlap(self):
        assert overlaps(req(MON, FRI), req(TUE, duration="HALF_DAY", half="AFTERNOON"))


@pytest.mark.django_db
class TestBalance:
    def test_balance_figures(self, make_employee, make_request):
        rina = make_employee("rina", allowance=20)
        make_request(rina, MON, FRI, status="APPROVED")  # 5 used
        make_request(rina, NEXT_MON, NEXT_MON + timedelta(days=2))  # 3 pending

        assert balance(rina, 2026) == {
            "allowance": Decimal("20"),
            "used": Decimal("5"),
            "pending": Decimal("3"),
            "remaining": Decimal("15"),
            "available": Decimal("12"),
        }

    def test_ignores_rejected_and_cancelled(self, make_employee, make_request):
        rina = make_employee("rina")
        make_request(rina, MON, FRI, status="REJECTED")
        make_request(rina, NEXT_MON, status="CANCELLED")

        result = balance(rina, 2026)
        assert result["used"] == 0
        assert result["pending"] == 0
        assert result["remaining"] == Decimal("20")

    def test_counts_only_requests_starting_in_year(self, make_employee, make_request):
        rina = make_employee("rina")
        make_request(rina, date(2027, 1, 4), date(2027, 1, 5), status="APPROVED")

        assert balance(rina, 2026)["used"] == 0
        assert balance(rina, 2027)["used"] == Decimal("2")

    def test_half_days_are_summed_exactly(self, make_employee, make_request):
        rina = make_employee("rina")
        make_request(rina, TUE, duration="HALF_DAY", half="MORNING", status="APPROVED")

        assert balance(rina, 2026)["remaining"] == Decimal("19.5")
