from django.contrib import admin

from .models import Employee, LeaveRequest


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ("name", "manager", "annual_allowance")
    list_select_related = ("user", "manager__user")


@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = ("employee", "start_date", "end_date", "working_days", "status")
    list_filter = ("status",)
    list_select_related = ("employee__user",)
