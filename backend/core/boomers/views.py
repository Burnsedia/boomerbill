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
    serializer_class = BoomerSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        base = Boomer.objects.all()
        # Only compute heavy aggregates on detail/retrieve actions.
        # List calls get a lightweight queryset — aggregates are added
        # on-demand via get_serializer_context so the serializer can
        # fall back gracefully, but the main win is avoiding GROUP BY
        # across the entire Session table on every list request.
        if self.action == "retrieve":
            return base.annotate(
                total_sessions=Count("boomer_sessions"),
                total_minutes=Coalesce(Sum("boomer_sessions__minutes"), Value(0)),
                total_cost=Coalesce(Sum("boomer_sessions__cost"), Value(0)),
                avg_minutes=Coalesce(Avg("boomer_sessions__minutes"), Value(0.0)),
                avg_cost=Coalesce(Avg("boomer_sessions__cost"), Value(0.0)),
                last_session_at=Max("boomer_sessions__end"),
            )
        return base


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

        # ------------------------------------------------------------------
        # 1. Build in-memory maps from payload
        # ------------------------------------------------------------------
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

        # ------------------------------------------------------------------
        # 2. Preload existing categories into in-memory maps
        #    - User-owned categories keyed by normalized_name
        #    - Default (owner=None) categories keyed by normalized_name
        # ------------------------------------------------------------------
        user_categories = {
            c.normalized_name: c
            for c in Category.objects.filter(owner=request.user)
        }
        default_categories = {
            c.normalized_name: c
            for c in Category.objects.filter(owner=None)
        }

        # ------------------------------------------------------------------
        # 3. Process categories from payload — batch create missing ones
        # ------------------------------------------------------------------
        categories_to_create = []
        for cat in category_by_id.values():
            norm = cat["normalized_name"]
            if cat["is_default"]:
                if norm not in default_categories:
                    categories_to_create.append(
                        Category(
                            id=f"default-{uuid.uuid4().hex[:10]}",
                            name=cat["name"],
                            is_default=True,
                            is_shared=True,
                            owner=None,
                        )
                    )
                continue

            if norm in user_categories:
                # Update name if changed
                existing = user_categories[norm]
                if existing.name != cat["name"]:
                    existing.name = cat["name"]
                    existing.save(update_fields=["name", "normalized_name"])
                continue

            # New user-owned category
            categories_to_create.append(
                Category(
                    id=str(cat["id"])[:100],
                    name=cat["name"],
                    is_default=False,
                    owner=request.user,
                    is_shared=cat["is_shared"],
                )
            )

        if categories_to_create:
            Category.objects.bulk_create(categories_to_create, ignore_conflicts=True)
            # Refresh in-memory maps with newly created categories
            for cat in categories_to_create:
                if cat.owner is None:
                    default_categories[cat.normalized_name] = cat
                else:
                    user_categories[cat.normalized_name] = cat

        # ------------------------------------------------------------------
        # 4. Preload existing boomers into in-memory map
        # ------------------------------------------------------------------
        boomer_name_map = {b.name: b for b in Boomer.objects.all()}
        boomers_to_create = []

        # ------------------------------------------------------------------
        # 5. Process sessions — batch resolve and create
        # ------------------------------------------------------------------
        created = 0
        skipped = 0

        # First pass: resolve all records, collect boomer names to create
        resolved_sessions = []
        for record in sessions:
            if not isinstance(record, dict):
                skipped += 1
                continue

            boomer_ref = str(record.get("boomerId", ""))
            category_ref = str(record.get("categoryId", ""))
            boomer_name = boomer_name_by_id.get(boomer_ref)
            category_payload = category_by_id.get(category_ref)

            # Fallback: look up category by ID in DB (already preloaded)
            if not category_payload and category_ref:
                # Check user-owned categories first, then default
                for cat_map in (user_categories.values(), default_categories.values()):
                    for c in cat_map:
                        if c.id == category_ref:
                            category_payload = {
                                "name": c.name,
                                "normalized_name": c.normalized_name,
                                "is_default": c.is_default,
                                "is_shared": c.is_shared,
                            }
                            break
                    if category_payload:
                        break

            if not boomer_name or not category_payload:
                skipped += 1
                continue

            # Resolve boomer (create later if missing)
            if boomer_name not in boomer_name_map:
                if boomer_name not in {b.name for b in boomers_to_create}:
                    boomers_to_create.append(Boomer(name=boomer_name, cost=0))
            boomer = boomer_name_map.get(boomer_name)

            # Resolve category from preloaded maps
            norm = category_payload["normalized_name"]
            category = user_categories.get(norm) or default_categories.get(norm)
            if not category:
                # Create on-the-fly (shouldn't happen if category processing was correct,
                # but handle edge case where category wasn't in payload)
                category = Category(
                    id=f"category-{uuid.uuid4().hex[:12]}",
                    name=category_payload["name"],
                    is_default=bool(category_payload["is_default"]),
                    owner=None if category_payload["is_default"] else request.user,
                    is_shared=bool(category_payload.get("is_shared", False)),
                )
                categories_to_create.append(category)
                if category.owner is None:
                    default_categories[norm] = category
                else:
                    user_categories[norm] = category

            # Parse timestamps
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

            resolved_sessions.append({
                "boomer_name": boomer_name,
                "boomer": boomer,  # may be None if new
                "category": category,
                "minutes": minutes,
                "cost": max(0, cost_value),
                "start": started_dt,
                "end": ended_dt,
                "note": note,
            })

        # Batch-create missing boomers
        if boomers_to_create:
            Boomer.objects.bulk_create(boomers_to_create, ignore_conflicts=True)
            # Refresh boomer map
            for b in boomers_to_create:
                boomer_name_map[b.name] = b

        # Batch-create missing categories from session fallback
        if categories_to_create:
            # Re-bulk-create only those not yet saved (no pk)
            unsaved = [c for c in categories_to_create if c.pk is None]
            if unsaved:
                Category.objects.bulk_create(unsaved, ignore_conflicts=True)
                for c in unsaved:
                    if c.owner is None:
                        default_categories[c.normalized_name] = c
                    else:
                        user_categories[c.normalized_name] = c

        # Deduplicate resolved sessions by their unique key (same semantics as get_or_create)
        # Then batch-check which ones already exist in DB
        seen_keys = set()
        unique_sessions = []
        for rs in resolved_sessions:
            key = (
                request.user.id,
                rs["boomer_name"],
                rs["category"].id,
                rs["minutes"],
                rs["cost"],
                rs["start"],
                rs["end"],
                rs["note"],
            )
            if key not in seen_keys:
                seen_keys.add(key)
                unique_sessions.append(rs)

        if unique_sessions:
            # Build set of existing session signatures for this user
            existing_signatures = set(
                Session.objects.filter(owner=request.user).values_list(
                    "boomer__name",
                    "category_id",
                    "minutes",
                    "cost",
                    "start",
                    "end",
                    "note",
                )
            )

            sessions_to_create = []
            for rs in unique_sessions:
                boomer = boomer_name_map.get(rs["boomer_name"])
                sig = (
                    rs["boomer_name"],
                    rs["category"].id,
                    rs["minutes"],
                    rs["cost"],
                    rs["start"],
                    rs["end"],
                    rs["note"],
                )
                if sig not in existing_signatures and boomer:
                    sessions_to_create.append(
                        Session(
                            owner=request.user,
                            boomer=boomer,
                            category=rs["category"],
                            minutes=rs["minutes"],
                            cost=rs["cost"],
                            start=rs["start"],
                            end=rs["end"],
                            note=rs["note"],
                        )
                    )

            if sessions_to_create:
                Session.objects.bulk_create(sessions_to_create)
                created = len(sessions_to_create)
                skipped += len(unique_sessions) - created
            else:
                skipped += len(unique_sessions)
        else:
            # All were duplicates or invalid within the payload itself
            pass

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
