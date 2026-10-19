from django.urls import path

from . import views

urlpatterns = [
    path("auth/csrf", views.CsrfView.as_view()),
    path("auth/login", views.LoginView.as_view()),
    path("auth/logout", views.LogoutView.as_view()),
    path("auth/me", views.MeView.as_view()),
    path("balance", views.BalanceView.as_view()),
    path("requests", views.MyRequestsView.as_view()),
    path("requests/<int:pk>/cancel", views.CancelRequestView.as_view()),
    path("team/requests", views.TeamRequestsView.as_view()),
    path("team/requests/<int:pk>/approve", views.ApproveView.as_view()),
    path("team/requests/<int:pk>/reject", views.RejectView.as_view()),
]
