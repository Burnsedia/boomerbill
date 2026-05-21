# Generated manually for performance optimization (#15)
# Add targeted indexes for hot query paths on Session table.
# Follow and MessagePost indexes are in community/migrations/0003_add_performance_indexes.py

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("boomers", "0003_category_is_shared_category_normalized_name_and_more"),
    ]

    operations = [
        # --- Session indexes ---
        # Hot path: Session.objects.filter(owner=user).order_by("start")
        # Used in: SyncPullView, SessionViewSet list
        migrations.AddIndex(
            model_name="session",
            index=models.Index(
                fields=["owner", "start"],
                name="idx_session_owner_start",
            ),
        ),
        # Hot path: Session.objects.filter(owner=user, category=category).update(...)
        # Used in: CategoryViewSet.remove_or_unimport
        migrations.AddIndex(
            model_name="session",
            index=models.Index(
                fields=["owner", "category"],
                name="idx_session_owner_category",
            ),
        ),
        # Hot path: Boomer.objects.annotate(last_session_at=Max("boomer_sessions__end"))
        # Also: aggregate queries ordering by session end time
        migrations.AddIndex(
            model_name="session",
            index=models.Index(
                fields=["boomer", "end"],
                name="idx_session_boomer_end",
            ),
        ),
        # Hot path: PublicBoomerWall - aggregate cost per boomer
        # Enables index-only scans for SUM(cost) grouped by boomer
        migrations.AddIndex(
            model_name="session",
            index=models.Index(
                fields=["boomer", "cost"],
                name="idx_session_boomer_cost",
            ),
        ),
        # Hot path: PublicUserLeaderboard - SUM(cost)/SUM(minutes) per owner
        migrations.AddIndex(
            model_name="session",
            index=models.Index(
                fields=["owner", "cost", "minutes"],
                name="idx_session_owner_cost_minutes",
            ),
        ),
        # Hot path: PublicBoomerWall top-category subquery
        # Session.objects.filter(boomer_id__in=...).values("boomer_id", "category_id").annotate(Sum(cost))
        migrations.AddIndex(
            model_name="session",
            index=models.Index(
                fields=["boomer", "category", "cost"],
                name="idx_session_boomer_category_cost",
            ),
        ),
    ]
