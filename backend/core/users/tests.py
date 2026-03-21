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
