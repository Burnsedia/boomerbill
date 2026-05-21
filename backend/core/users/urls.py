from django.urls import path

from .views import PasswordResetMetaView

urlpatterns = [
    path("password-reset-meta/", PasswordResetMetaView.as_view(), name="password-reset-meta"),
]
