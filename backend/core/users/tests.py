from django.contrib.auth import get_user_model
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.test import override_settings
from rest_framework.test import APITestCase


class DjoserSignupTests(APITestCase):
    def test_signup_requires_email(self):
        response = self.client.post(
            "/api/auth/users/",
            {"username": "emailrequired", "password": "strong-pass-123"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)

    def test_signup_succeeds_with_email(self):
        response = self.client.post(
            "/api/auth/users/",
            {
                "username": "emailok",
                "email": "emailok@example.com",
                "password": "strong-pass-123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["username"], "emailok")
        self.assertEqual(response.data["email"], "emailok@example.com")


class AuthMigrationApiTests(APITestCase):
    def setUp(self):
        self.username = "migrate-user"
        self.password = "strong-pass-123"
        self.user = self._create_user()

    def _create_user(self):
        return get_user_model().objects.create_user(
            username=self.username,
            email="migrate@example.com",
            password=self.password,
        )

    def test_token_login_remains_compatible_for_protected_endpoints(self):
        login = self.client.post(
            "/api/auth/token/login/",
            {"username": self.username, "password": self.password},
            format="json",
        )

        self.assertEqual(login.status_code, 200)
        self.assertIn("auth_token", login.data)

        self.client.credentials(HTTP_AUTHORIZATION=f"Token {login.data['auth_token']}")
        create_post = self.client.post("/api/messages/", {"body": "token works"}, format="json")
        self.assertEqual(create_post.status_code, 201)

    def test_legacy_and_jwt_login_endpoints_coexist(self):
        token_login = self.client.post(
            "/api/auth/token/login/",
            {"username": self.username, "password": self.password},
            format="json",
        )
        jwt_login = self.client.post(
            "/api/auth/jwt/create/",
            {"username": self.username, "password": self.password},
            format="json",
        )

        self.assertEqual(token_login.status_code, 200)
        self.assertIn("auth_token", token_login.data)
        self.assertEqual(jwt_login.status_code, 200)
        self.assertIn("access", jwt_login.data)

    def test_jwt_create_and_refresh_work_on_protected_endpoints(self):
        create = self.client.post(
            "/api/auth/jwt/create/",
            {"username": self.username, "password": self.password},
            format="json",
        )

        self.assertEqual(create.status_code, 200)
        self.assertIn("access", create.data)
        self.assertIn("refresh", create.data)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {create.data['access']}")
        with_access = self.client.post(
            "/api/messages/", {"body": "jwt access works"}, format="json"
        )
        self.assertEqual(with_access.status_code, 201)

        refresh = self.client.post(
            "/api/auth/jwt/refresh/",
            {"refresh": create.data["refresh"]},
            format="json",
        )
        self.assertEqual(refresh.status_code, 200)
        self.assertIn("access", refresh.data)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.data['access']}")
        with_refreshed_access = self.client.post(
            "/api/messages/", {"body": "jwt refresh works"}, format="json"
        )
        self.assertEqual(with_refreshed_access.status_code, 201)

    def test_malformed_or_invalid_authorization_is_rejected(self):
        self.client.credentials(HTTP_AUTHORIZATION="Bearer malformed.token")
        malformed = self.client.post("/api/messages/", {"body": "bad"}, format="json")
        self.assertEqual(malformed.status_code, 401)

        self.client.credentials(HTTP_AUTHORIZATION="Token invalidtokenvalue")
        invalid_token = self.client.post("/api/messages/", {"body": "bad"}, format="json")
        self.assertEqual(invalid_token.status_code, 401)


class AuthEndpointAccessibilityTests(APITestCase):
    def setUp(self):
        self.username = "auth-user"
        self.password = "strong-pass-123"
        get_user_model().objects.create_user(
            username=self.username,
            email="auth-user@example.com",
            password=self.password,
        )

    def test_token_login_endpoint_matches_auth_mode_configuration(self):
        response = self.client.post(
            "/api/auth/token/login/",
            {"username": self.username, "password": self.password},
            format="json",
        )

        if settings.ENABLE_LEGACY_TOKEN_AUTH:
            self.assertEqual(response.status_code, 200)
            self.assertIn("auth_token", response.data)
        else:
            self.assertEqual(response.status_code, 404)

    def test_jwt_create_endpoint_matches_auth_mode_configuration(self):
        response = self.client.post(
            "/api/auth/jwt/create/",
            {"username": self.username, "password": self.password},
            format="json",
        )

        if settings.ENABLE_JWT_AUTH:
            self.assertEqual(response.status_code, 200)
            self.assertIn("access", response.data)
            self.assertIn("refresh", response.data)
        else:
            self.assertEqual(response.status_code, 404)

    def test_malformed_auth_payloads_return_validation_errors(self):
        if settings.ENABLE_JWT_AUTH:
            missing_password = self.client.post(
                "/api/auth/jwt/create/",
                {"username": self.username},
                format="json",
            )
            self.assertEqual(missing_password.status_code, 400)
            self.assertIn("password", missing_password.data)

            bad_refresh_payload = self.client.post(
                "/api/auth/jwt/refresh/",
                {"refresh": "not-a-jwt"},
                format="json",
            )
            self.assertEqual(bad_refresh_payload.status_code, 401)

        if settings.ENABLE_LEGACY_TOKEN_AUTH:
            missing_password = self.client.post(
                "/api/auth/token/login/",
                {"username": self.username},
                format="json",
            )
            self.assertEqual(missing_password.status_code, 400)
            self.assertTrue(
                "password" in missing_password.data
                or "non_field_errors" in missing_password.data
            )


class AuthCorsTests(APITestCase):
    @override_settings(CORS_ALLOWED_ORIGINS=["http://localhost:4321"])
    def test_preflight_is_allowed_for_auth_login_endpoint(self):
        response = self.client.options(
            "/api/auth/token/login/",
            HTTP_ORIGIN="http://localhost:4321",
            HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
            HTTP_ACCESS_CONTROL_REQUEST_HEADERS="content-type,authorization",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response["Access-Control-Allow-Origin"],
            "http://localhost:4321",
        )
        self.assertIn("POST", response["Access-Control-Allow-Methods"])


class PasswordResetMetaTests(APITestCase):
    def test_password_reset_meta_defaults_to_console_mode(self):
        response = self.client.get("/api/auth/password-reset-meta/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["email_provider"], "console")
        self.assertIn("reset-password", response.data["password_reset_confirm_url"])

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend")
    def test_password_reset_meta_reflects_smtp_mode(self):
        response = self.client.get("/api/auth/password-reset-meta/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["email_provider"], "smtp")


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class PasswordResetApiTests(APITestCase):
    def setUp(self):
        self.user_email = "reset-user@example.com"
        self.old_password = "strong-pass-123"
        self.new_password = "new-strong-pass-456"
        self.user = get_user_model().objects.create_user(
            username="reset-user",
            email=self.user_email,
            password=self.old_password,
        )

    def test_reset_request_success_for_registered_email(self):
        response = self.client.post(
            "/api/auth/users/reset_password/",
            {"email": self.user_email},
            format="json",
        )

        self.assertEqual(response.status_code, 204)
        self.assertEqual(response.content, b"")
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(self.user_email, mail.outbox[0].to)

    def test_reset_confirm_successfully_updates_password(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)

        confirm_response = self.client.post(
            "/api/auth/users/reset_password_confirm/",
            {"uid": uid, "token": token, "new_password": self.new_password},
            format="json",
        )
        self.assertEqual(confirm_response.status_code, 204)
        self.assertEqual(confirm_response.content, b"")

        old_password_login = self.client.post(
            "/api/auth/token/login/",
            {"username": self.user.username, "password": self.old_password},
            format="json",
        )
        self.assertEqual(old_password_login.status_code, 400)

        new_password_login = self.client.post(
            "/api/auth/token/login/",
            {"username": self.user.username, "password": self.new_password},
            format="json",
        )

        if settings.ENABLE_LEGACY_TOKEN_AUTH:
            self.assertEqual(new_password_login.status_code, 200)
            self.assertIn("auth_token", new_password_login.data)
        else:
            self.assertEqual(new_password_login.status_code, 404)

    def test_reset_confirm_rejects_invalid_token(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))

        response = self.client.post(
            "/api/auth/users/reset_password_confirm/",
            {"uid": uid, "token": "invalid-token", "new_password": self.new_password},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("token", response.data)

    def test_reset_request_is_non_enumerating_for_existing_and_missing_email(self):
        existing_email_response = self.client.post(
            "/api/auth/users/reset_password/",
            {"email": self.user_email},
            format="json",
        )
        missing_email_response = self.client.post(
            "/api/auth/users/reset_password/",
            {"email": "unknown@example.com"},
            format="json",
        )

        self.assertEqual(existing_email_response.status_code, 204)
        self.assertEqual(missing_email_response.status_code, 204)
        self.assertEqual(existing_email_response.content, b"")
        self.assertEqual(missing_email_response.content, b"")
        self.assertEqual(len(mail.outbox), 1)
