from django.contrib.auth import get_user_model
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
