from django.utils import timezone
from rest_framework import serializers

from . import rules
from .models import Employee, LeaveRequest

NO_MANAGER = "You have no manager assigned. Contact an administrator."
END_BEFORE_START = "End date must be on or after the start date."
PAST_START = "Start date cannot be in the past."
CROSSES_YEAR = "A request cannot span two calendar years. Please split it at 31 December."
HALF_DAY_SAME_DATE = "A half-day request must start and end on the same date."
HALF_DAY_WEEKEND = "A half day must be on a working day (Monday–Friday)."
HALF_REQUIRED = "Choose Morning or Afternoon for a half-day request."
NO_WORKING_DAYS = "The selected dates contain no working days (Monday–Friday)."
OVERLAP = "This request overlaps another pending or approved request."


class MeSerializer(serializers.ModelSerializer):
    name = serializers.CharField(read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)
    has_manager = serializers.SerializerMethodField()
    is_manager = serializers.BooleanField(read_only=True)

    class Meta:
        model = Employee
        fields = ["id", "name", "username", "has_manager", "is_manager"]

    def get_has_manager(self, employee):
        return employee.manager_id is not None


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()


class PersonSerializer(serializers.ModelSerializer):
    name = serializers.CharField(read_only=True)

    class Meta:
        model = Employee
        fields = ["id", "name"]


class BalanceSerializer(serializers.Serializer):
    year = serializers.IntegerField()
    allowance = serializers.DecimalField(max_digits=5, decimal_places=1)
    used = serializers.DecimalField(max_digits=5, decimal_places=1)
    pending = serializers.DecimalField(max_digits=5, decimal_places=1)
    remaining = serializers.DecimalField(max_digits=5, decimal_places=1)
    available = serializers.DecimalField(max_digits=5, decimal_places=1)


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee = PersonSerializer(read_only=True)
    decided_by = PersonSerializer(read_only=True)
    reason = serializers.CharField(max_length=500, required=False, allow_blank=True)

    class Meta:
        model = LeaveRequest
        fields = [
            "id",
            "employee",
            "start_date",
            "end_date",
            "duration",
            "half",
            "working_days",
            "reason",
            "status",
            "decision_comment",
            "decided_by",
            "decided_at",
            "created_at",
        ]
        read_only_fields = [
            "working_days",
            "status",
            "decision_comment",
            "decided_at",
            "created_at",
        ]

    def validate(self, attrs):
        """Apply the creation rules from data-model.md in order."""
        employee = self.context["employee"]
        start, end = attrs["start_date"], attrs["end_date"]
        duration = attrs.get("duration", rules.FULL_DAY)

        if employee.manager_id is None:
            raise serializers.ValidationError(NO_MANAGER)
        if end < start:
            raise serializers.ValidationError({"end_date": END_BEFORE_START})
        if start < timezone.localdate():
            raise serializers.ValidationError({"start_date": PAST_START})
        if start.year != end.year:
            raise serializers.ValidationError(CROSSES_YEAR)

        if duration == rules.HALF_DAY:
            if start != end:
                raise serializers.ValidationError(HALF_DAY_SAME_DATE)
            if start.weekday() >= 5:
                raise serializers.ValidationError(HALF_DAY_WEEKEND)
            if not attrs.get("half"):
                raise serializers.ValidationError({"half": HALF_REQUIRED})
        else:
            attrs["half"] = None

        working_days = rules.compute_working_days(duration, start, end)
        if working_days <= 0:
            raise serializers.ValidationError(NO_WORKING_DAYS)

        candidate = LeaveRequest(start_date=start, end_date=end, duration=duration, half=attrs["half"])
        nearby = employee.leave_requests.filter(
            status__in=rules.ACTIVE_STATUSES, start_date__lte=end, end_date__gte=start
        )
        if any(rules.overlaps(candidate, existing) for existing in nearby):
            raise serializers.ValidationError(OVERLAP)

        available = rules.balance(employee, start.year)["available"]
        if working_days > available:
            raise serializers.ValidationError(
                f"This request needs {rules.format_days(working_days)} days "
                f"but only {rules.format_days(available)} are available."
            )

        attrs["working_days"] = working_days
        return attrs

    def create(self, validated_data):
        return LeaveRequest.objects.create(employee=self.context["employee"], **validated_data)
