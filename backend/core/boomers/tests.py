from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase

from boomers.models import Boomer, Category, Session


class BoomerStatsApiTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.owner = user_model.objects.create_user(
            username="owner",
            password="strong-pass-123",
        )
        self.category = Category.objects.create(
            id="general",
            name="General",
            is_default=True,
        )

    def test_boomer_list_includes_aggregated_stats(self):
        boomer = Boomer.objects.create(name="Dad", cost=0)
        now = timezone.now()

        Session.objects.create(
            owner=self.owner,
            boomer=boomer,
            category=self.category,
            minutes=10,
            cost=2500,
            start=now - timedelta(minutes=10),
            end=now,
            note="WiFi reset",
        )
        Session.objects.create(
            owner=self.owner,
            boomer=boomer,
            category=self.category,
            minutes=20,
            cost=5000,
            start=now - timedelta(minutes=40),
            end=now - timedelta(minutes=20),
            note="Printer setup",
        )

        response = self.client.get("/api/boomers/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        payload = response.data[0]
        self.assertEqual(payload["name"], "Dad")
        self.assertEqual(payload["total_sessions"], 2)
        self.assertEqual(payload["total_minutes"], 30)
        self.assertEqual(payload["total_cost"], 7500)
        self.assertEqual(payload["avg_minutes"], 15.0)
        self.assertEqual(payload["avg_cost"], 3750.0)
        self.assertIsNotNone(payload["last_session_at"])

    def test_boomer_with_no_sessions_returns_zero_stats(self):
        boomer = Boomer.objects.create(name="Mom", cost=0)

        response = self.client.get(f"/api/boomers/{boomer.id}/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total_sessions"], 0)
        self.assertEqual(response.data["total_minutes"], 0)
        self.assertEqual(response.data["total_cost"], 0)
        self.assertEqual(response.data["avg_minutes"], 0.0)
        self.assertEqual(response.data["avg_cost"], 0.0)
        self.assertIsNone(response.data["last_session_at"])


class SyncApiTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.owner = user_model.objects.create_user(
            username="sync-owner",
            password="strong-pass-123",
        )
        self.category = Category.objects.create(
            id="general-sync",
            name="General",
            is_default=True,
        )
        self.boomer = Boomer.objects.create(name="Sync Dad", cost=0)

    def test_pull_returns_user_sessions(self):
        now = timezone.now()
        Session.objects.create(
            owner=self.owner,
            boomer=self.boomer,
            category=self.category,
            minutes=15,
            cost=2500,
            start=now - timedelta(minutes=20),
            end=now - timedelta(minutes=5),
            note="sync note",
        )

        self.client.force_authenticate(self.owner)
        response = self.client.get("/api/sync/pull/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["sessions"]), 1)
        self.assertEqual(response.data["sessions"][0]["boomerName"], "Sync Dad")

    def test_pull_includes_shared_categories_separately(self):
        user_model = get_user_model()
        other = user_model.objects.create_user(
            username="other-user",
            password="strong-pass-123",
        )
        Category.objects.create(
            id="shared-printer",
            name="Shared Printer",
            is_default=False,
            owner=other,
            is_shared=True,
        )

        self.client.force_authenticate(self.owner)
        response = self.client.get("/api/sync/pull/")

        self.assertEqual(response.status_code, 200)
        shared = response.data.get("sharedCategories", [])
        self.assertTrue(any(item["name"] == "Shared Printer" for item in shared))


class CategorySharingApiTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.owner = user_model.objects.create_user(
            username="category-owner",
            password="strong-pass-123",
        )
        self.other = user_model.objects.create_user(
            username="category-other",
            password="strong-pass-123",
        )
        self.private_category = Category.objects.create(
            id="cat-private",
            name="Private Cat",
            is_default=False,
            owner=self.owner,
            is_shared=False,
        )

    def test_owner_can_share_category(self):
        self.client.force_authenticate(self.owner)
        response = self.client.post(f"/api/category/{self.private_category.id}/share/")

        self.assertEqual(response.status_code, 200)
        self.private_category.refresh_from_db()
        self.assertTrue(self.private_category.is_shared)

    def test_other_user_cannot_share_category(self):
        self.client.force_authenticate(self.other)
        response = self.client.post(f"/api/category/{self.private_category.id}/share/")

        self.assertEqual(response.status_code, 404)

    def test_user_can_import_shared_category_copy(self):
        shared = Category.objects.create(
            id="cat-shared",
            name="Shared Cat",
            is_default=False,
            owner=self.owner,
            is_shared=True,
        )
        self.client.force_authenticate(self.other)

        response = self.client.post(f"/api/category/{shared.id}/import_shared/")

        self.assertEqual(response.status_code, 201)
        self.assertTrue(
            Category.objects.filter(
                owner=self.other, normalized_name=shared.normalized_name
            ).exists()
        )

    def test_push_creates_session_for_owner(self):
        self.client.force_authenticate(self.owner)
        payload = {
            "boomers": [{"id": "boomer-1", "name": "Cloud Dad"}],
            "categories": [
                {"id": "wifi", "name": "WiFi", "isDefault": True},
            ],
            "sessions": [
                {
                    "boomerId": "boomer-1",
                    "categoryId": "wifi",
                    "minutes": 10,
                    "cost": 12.5,
                    "startedAt": 1710000000000,
                    "endedAt": 1710000600000,
                    "note": "router",
                }
            ],
        }

        response = self.client.post("/api/sync/push/", payload, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["created"], 1)
        self.assertEqual(Session.objects.filter(owner=self.owner).count(), 1)

    def test_push_preserves_custom_category_id_for_user(self):
        self.client.force_authenticate(self.owner)
        payload = {
            "boomers": [{"id": "boomer-1", "name": "Cloud Dad"}],
            "categories": [
                {
                    "id": "category-1774067302349",
                    "name": "New Shared Category",
                    "isDefault": False,
                    "isShared": False,
                },
            ],
            "sessions": [],
        }

        response = self.client.post("/api/sync/push/", payload, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            Category.objects.filter(
                id="category-1774067302349", owner=self.owner
            ).exists()
        )
