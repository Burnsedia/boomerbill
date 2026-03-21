from datetime import datetime, timezone

from django.db.models import Avg, Count, Max, Sum, Value
from django.db.models.functions import Coalesce
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from boomers.models import Boomer, Category, Session
from boomers.permissions import IsOwnerOrReadOnly
from .serializers import CategorySerializer, BoomerSerializer, SessionSerializer


class CategoryViewSet(ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class BoomerViewSet(ModelViewSet):
    queryset = Boomer.objects.annotate(
        total_sessions=Count("boomer_sessions"),
        total_minutes=Coalesce(Sum("boomer_sessions__minutes"), Value(0)),
        total_cost=Coalesce(Sum("boomer_sessions__cost"), Value(0)),
        avg_minutes=Coalesce(Avg("boomer_sessions__minutes"), Value(0.0)),
        avg_cost=Coalesce(Avg("boomer_sessions__cost"), Value(0.0)),
        last_session_at=Max("boomer_sessions__end"),
    )
    serializer_class = BoomerSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class SessionViewSet(ModelViewSet):
    serializer_class = SessionSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Session.objects.all()
        return Session.objects.filter(owner=user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class SyncPushView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        payload = request.data if isinstance(request.data, dict) else {}
        boomers = payload.get("boomers", [])
        categories = payload.get("categories", [])
        sessions = payload.get("sessions", [])

        boomer_name_by_id = {}
        for boomer in boomers:
            if isinstance(boomer, dict):
                boomer_id = boomer.get("id")
                boomer_name = (boomer.get("name") or "").strip()
                if boomer_id and boomer_name:
                    boomer_name_by_id[str(boomer_id)] = boomer_name

        category_by_id = {}
        for category in categories:
            if isinstance(category, dict):
                category_id = category.get("id")
                category_name = (category.get("name") or "").strip()
                if category_id and category_name:
                    category_by_id[str(category_id)] = {
                        "name": category_name,
                        "is_default": bool(category.get("isDefault", False)),
                    }

        created = 0
        skipped = 0

        for record in sessions:
            if not isinstance(record, dict):
                skipped += 1
                continue

            boomer_ref = str(record.get("boomerId", ""))
            category_ref = str(record.get("categoryId", ""))
            boomer_name = boomer_name_by_id.get(boomer_ref)
            category_payload = category_by_id.get(category_ref)

            if not boomer_name or not category_payload:
                skipped += 1
                continue

            boomer, _ = Boomer.objects.get_or_create(
                name=boomer_name, defaults={"cost": 0}
            )
            category, _ = Category.objects.get_or_create(
                id=category_ref,
                defaults={
                    "name": category_payload["name"],
                    "is_default": category_payload["is_default"],
                },
            )

            started_at = record.get("startedAt")
            ended_at = record.get("endedAt")
            minutes = int(record.get("minutes", 0))
            note = str(record.get("note", "") or "")
            raw_cost = record.get("cost", 0)

            try:
                started_dt = datetime.fromtimestamp(
                    float(started_at) / 1000.0, tz=timezone.utc
                )
                ended_dt = datetime.fromtimestamp(
                    float(ended_at) / 1000.0, tz=timezone.utc
                )
            except (TypeError, ValueError, OSError):
                skipped += 1
                continue

            if minutes < 0 or ended_dt <= started_dt:
                skipped += 1
                continue

            try:
                cost_value = int(round(float(raw_cost) * 100))
            except (TypeError, ValueError):
                cost_value = 0

            _, created_flag = Session.objects.get_or_create(
                owner=request.user,
                boomer=boomer,
                category=category,
                minutes=minutes,
                cost=max(0, cost_value),
                start=started_dt,
                end=ended_dt,
                note=note,
            )
            if created_flag:
                created += 1
            else:
                skipped += 1

        return Response(
            {"created": created, "skipped": skipped, "total": len(sessions)}
        )


class SyncPullView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user_sessions = (
            Session.objects.filter(owner=request.user)
            .select_related("boomer", "category")
            .order_by("start")
        )

        boomer_names = sorted(
            {
                session.boomer.name
                for session in user_sessions
                if session.boomer and session.boomer.name
            }
        )
        category_ids = {session.category_id for session in user_sessions}
        categories = list(Category.objects.filter(id__in=category_ids).order_by("name"))

        payload = {
            "boomers": [{"name": name} for name in boomer_names],
            "categories": [
                {
                    "id": category.id,
                    "name": category.name,
                    "isDefault": category.is_default,
                }
                for category in categories
            ],
            "sessions": [
                {
                    "boomerName": session.boomer.name,
                    "categoryId": session.category.id,
                    "minutes": session.minutes,
                    "cost": round(session.cost / 100, 2),
                    "startedAt": int(session.start.timestamp() * 1000),
                    "endedAt": int(session.end.timestamp() * 1000),
                    "note": session.note,
                }
                for session in user_sessions
            ],
        }
        return Response(payload)
