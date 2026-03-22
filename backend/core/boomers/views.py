from datetime import datetime, timezone
import uuid

from django.db import models
from django.db.models import Avg, Count, Max, Sum, Value
from django.db.models.functions import Coalesce
from rest_framework.decorators import action
from rest_framework import permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from boomers.models import Boomer, Category, Session
from boomers.permissions import IsOwnerOrReadOnly
from .serializers import CategorySerializer, BoomerSerializer, SessionSerializer


class CategoryViewSet(ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        base = Category.objects.all()
        if not user.is_authenticated:
            return base.filter(is_default=True)
        return base.filter(
            models.Q(is_default=True) | models.Q(owner=user) | models.Q(is_shared=True)
        ).distinct()

    def perform_create(self, serializer):
        user = self.request.user
        name = serializer.validated_data["name"]
        normalized = " ".join(name.lower().split())
        existing = Category.objects.filter(
            owner=user, normalized_name=normalized
        ).first()
        if existing:
            raise serializers.ValidationError(
                {"name": "Category with this name already exists for your account."}
            )
        serializer.save(owner=user, is_default=False)

    @action(
        detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated]
    )
    def mine(self, request):
        queryset = Category.objects.filter(
            models.Q(is_default=True) | models.Q(owner=request.user)
        ).order_by("name")
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], permission_classes=[permissions.AllowAny])
    def shared(self, request):
        queryset = Category.objects.filter(is_shared=True).order_by("name")
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(
        detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated]
    )
    def share(self, request, pk=None):
        category = self.get_object()
        if category.owner_id != request.user.id:
            return Response(
                {"detail": "Only the owner can share this category."}, status=403
            )
        category.is_shared = True
        category.save(update_fields=["is_shared", "normalized_name", "name"])
        return Response(self.get_serializer(category).data)

    @action(
        detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated]
    )
    def unshare(self, request, pk=None):
        category = self.get_object()
        if category.owner_id != request.user.id:
            return Response(
                {"detail": "Only the owner can unshare this category."}, status=403
            )
        category.is_shared = False
        category.save(update_fields=["is_shared", "normalized_name", "name"])
        return Response(self.get_serializer(category).data)

    @action(
        detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated]
    )
    def import_shared(self, request, pk=None):
        source = self.get_object()
        if not source.is_shared and not source.is_default:
            return Response({"detail": "Category is not shared."}, status=400)

        existing = Category.objects.filter(
            owner=request.user,
            normalized_name=source.normalized_name,
        ).first()
        if existing:
            return Response(self.get_serializer(existing).data)

        imported = Category.objects.create(
            id=f"category-{uuid.uuid4().hex[:12]}",
            name=source.name,
            is_default=False,
            owner=request.user,
            is_shared=False,
        )
        return Response(self.get_serializer(imported).data, status=201)

    @action(
        detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated]
    )
    def remove_or_unimport(self, request, pk=None):
        category = self.get_object()
        if category.is_default:
            return Response(
                {"detail": "Default categories cannot be removed."}, status=400
            )
        if category.owner_id != request.user.id:
            return Response(
                {"detail": "Only the owner can remove this category."}, status=403
            )

        fallback = (
            Category.objects.filter(
                owner=None,
                normalized_name="general tech support",
            )
            .exclude(pk=category.pk)
            .first()
        )
        if not fallback:
            fallback = (
                Category.objects.filter(
                    models.Q(owner=request.user) | models.Q(owner=None),
                    is_default=True,
                )
                .exclude(pk=category.pk)
                .order_by("name")
                .first()
            )
        if not fallback:
            return Response(
                {"detail": "No fallback category available for reassignment."},
                status=400,
            )

        reassigned = Session.objects.filter(
            owner=request.user, category=category
        ).update(category=fallback)
        removed_id = category.id
        category.delete()
        return Response(
            {
                "id": removed_id,
                "reassigned_sessions": reassigned,
                "fallback_category_id": fallback.id,
            }
        )


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
                    normalized_name = " ".join(category_name.lower().split())
                    category_by_id[str(category_id)] = {
                        "id": str(category_id),
                        "name": category_name,
                        "normalized_name": normalized_name,
                        "is_default": bool(category.get("isDefault", False)),
                        "is_shared": bool(category.get("isShared", False)),
                    }

        for category in category_by_id.values():
            if category["is_default"]:
                Category.objects.get_or_create(
                    normalized_name=category["normalized_name"],
                    owner=None,
                    defaults={
                        "id": f"default-{uuid.uuid4().hex[:10]}",
                        "name": category["name"],
                        "is_default": True,
                        "is_shared": True,
                    },
                )
                continue

            existing_owned = Category.objects.filter(
                owner=request.user,
                normalized_name=category["normalized_name"],
            ).first()
            if existing_owned:
                if existing_owned.name != category["name"]:
                    existing_owned.name = category["name"]
                    existing_owned.save(update_fields=["name", "normalized_name"])
                continue

            Category.objects.create(
                id=str(category["id"])[:100],
                name=category["name"],
                is_default=False,
                owner=request.user,
                is_shared=category["is_shared"],
            )

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
            if not category_payload and category_ref:
                existing_category = Category.objects.filter(id=category_ref).first()
                if existing_category:
                    category_payload = {
                        "name": existing_category.name,
                        "normalized_name": existing_category.normalized_name,
                        "is_default": existing_category.is_default,
                        "is_shared": existing_category.is_shared,
                    }

            if not boomer_name or not category_payload:
                skipped += 1
                continue

            boomer, _ = Boomer.objects.get_or_create(
                name=boomer_name, defaults={"cost": 0}
            )
            category = Category.objects.filter(
                owner=request.user,
                normalized_name=category_payload["normalized_name"],
            ).first()
            if not category:
                category = Category.objects.filter(
                    owner=None,
                    normalized_name=category_payload["normalized_name"],
                ).first()
            if not category:
                category = Category.objects.create(
                    id=f"category-{uuid.uuid4().hex[:12]}",
                    name=category_payload["name"],
                    is_default=bool(category_payload["is_default"]),
                    owner=None if category_payload["is_default"] else request.user,
                    is_shared=bool(category_payload.get("is_shared", False)),
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
        categories = list(
            Category.objects.filter(
                models.Q(is_default=True) | models.Q(owner=request.user)
            )
            .order_by("name")
            .distinct()
        )
        shared_categories = list(
            Category.objects.filter(is_shared=True)
            .exclude(owner=request.user)
            .order_by("name")
            .distinct()
        )

        payload = {
            "boomers": [{"name": name} for name in boomer_names],
            "categories": [
                {
                    "id": category.id,
                    "name": category.name,
                    "isDefault": category.is_default,
                    "isShared": category.is_shared,
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
            "sharedCategories": [
                {
                    "id": category.id,
                    "name": category.name,
                    "isDefault": category.is_default,
                    "isShared": category.is_shared,
                }
                for category in shared_categories
            ],
        }
        return Response(payload)
