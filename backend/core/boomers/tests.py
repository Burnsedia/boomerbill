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
