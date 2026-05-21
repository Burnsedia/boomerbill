# Generated manually for performance optimization (#15)
# Add targeted indexes for hot query paths on Follow and MessagePost tables.
# Split from boomers.0004 to fix cross-app model reference issue.

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("community", "0002_messagereply"),
    ]

    operations = [
        # --- Follow indexes ---
        # Hot path: Follow.objects.filter(following=target).count()
        # Used in: PublicUserProfileView (follower_count)
        migrations.AddIndex(
            model_name="follow",
            index=models.Index(
                fields=["following"],
                name="idx_follow_following",
            ),
        ),
        # Hot path: Follow.objects.filter(follower=request.user)
        # Used in: PublicMessagesView (following feed), FollowUserView
        # The unique constraint covers (follower, following) but a standalone
        # follower index helps reverse-lookup queries
        migrations.AddIndex(
            model_name="follow",
            index=models.Index(
                fields=["follower"],
                name="idx_follow_follower",
            ),
        ),

        # --- MessagePost indexes ---
        # Hot path: MessagePost.objects.filter(is_public=True).order_by("-created_at")
        # Used in: PublicMessagesView
        migrations.AddIndex(
            model_name="messagepost",
            index=models.Index(
                fields=["is_public", "-created_at"],
                name="idx_messagepost_public_created",
            ),
        ),
        # Hot path: MessagePost.objects.filter(is_public=True, author_id__in=...)
        # Used in: PublicMessagesView (following scope)
        migrations.AddIndex(
            model_name="messagepost",
            index=models.Index(
                fields=["is_public", "author"],
                name="idx_messagepost_public_author",
            ),
        ),
    ]
