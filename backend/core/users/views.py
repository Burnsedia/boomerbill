from django.conf import settings
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class PasswordResetMetaView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        provider = "smtp" if settings.EMAIL_BACKEND.endswith("smtp.EmailBackend") else "console"
        return Response(
            {
                "email_provider": provider,
                "password_reset_confirm_url": settings.DJOSER.get("PASSWORD_RESET_CONFIRM_URL"),
            }
        )
