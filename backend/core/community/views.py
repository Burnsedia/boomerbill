from datetime import datetime, timezone

from django.contrib.auth import get_user_model
from django.db.models import Count, Max, Sum
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from boomers.models import Boomer, Session
from .models import Follow, MessagePost, MessageReply
from .serializers import (
    MessagePostCreateSerializer,
    MessagePostSerializer,
    MessageReplyCreateSerializer,
    MessageReplySerializer,
)

User = get_user_model()


class PublicUserLeaderboardView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        leaderboard = list(
            Session.objects.values("owner_id", "owner__username")
            .annotate(
                total_sessions=Count("id"),
                total_minutes=Coalesce(Sum("minutes"), 0),
                total_cost=Coalesce(Sum("cost"), 0),
            )
            .order_by("-total_cost", "-total_minutes")[:100]
        )

        following_ids = set()
        if request.user.is_authenticated:
            user_ids = [item["owner_id"] for item in leaderboard]
            following_ids = set(
                Follow.objects.filter(
                    follower=request.user, following_id__in=user_ids
                ).values_list("following_id", flat=True)
            )

        payload = []
        for index, item in enumerate(leaderboard):
            payload.append(
                {
                    "rank": index + 1,
                    "user_id": item["owner_id"],
                    "username": item["owner__username"],
                    "total_sessions": item["total_sessions"],
                    "total_minutes": item["total_minutes"],
                    "total_cost": item["total_cost"],
                    "is_following": item["owner_id"] in following_ids,
                }
            )

        return Response(payload)


class PublicMessagesView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        sort = request.query_params.get("sort", "top")
        scope = request.query_params.get("scope", "all")

        queryset = MessagePost.objects.filter(is_public=True)
        if scope == "following":
            if not request.user.is_authenticated:
                return Response(
                    {"detail": "Authentication required for following feed."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            followed_user_ids = Follow.objects.filter(
                follower=request.user
            ).values_list("following_id", flat=True)
            queryset = queryset.filter(author_id__in=followed_user_ids)

        posts = list(
            queryset.select_related("author").annotate(reply_count=Count("replies"))[
                :100
            ]
        )

        now = datetime.now(timezone.utc)
        for post in posts:
            age_hours = max(1.0, (now - post.created_at).total_seconds() / 3600)
            post.hot_score = (post.reply_count + 1) / (age_hours**0.8)

        if sort == "new":
            posts.sort(key=lambda item: item.created_at, reverse=True)
        else:
            posts.sort(key=lambda item: item.hot_score, reverse=True)

        serializer = MessagePostSerializer(posts, many=True)
        return Response(serializer.data)


class MessageCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = MessagePostCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        post = serializer.save(author=request.user, is_public=True)
        payload = MessagePostSerializer(
            MessagePost.objects.filter(id=post.id)
            .annotate(reply_count=Count("replies"))
            .first()
        ).data
        payload["hot_score"] = 1.0
        return Response(payload, status=status.HTTP_201_CREATED)


class PublicMessageRepliesView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, post_id):
        post = get_object_or_404(MessagePost, id=post_id, is_public=True)
        replies = MessageReply.objects.filter(post=post).select_related("author")
        serializer = MessageReplySerializer(replies, many=True)
        return Response(serializer.data)


class MessageReplyCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, post_id):
        post = get_object_or_404(MessagePost, id=post_id, is_public=True)
        serializer = MessageReplyCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reply = serializer.save(post=post, author=request.user)
        refreshed_post = (
            MessagePost.objects.filter(id=post.id)
            .annotate(reply_count=Count("replies"))
            .first()
        )
        payload = {
            "reply": MessageReplySerializer(reply).data,
            "post": MessagePostSerializer(refreshed_post).data,
        }
        payload["post"]["hot_score"] = payload["post"].get("hot_score", 1.0)
        return Response(payload, status=status.HTTP_201_CREATED)


class FollowUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, username):
        target = get_object_or_404(User, username=username)
        if target.id == request.user.id:
            return Response(
                {"detail": "You cannot follow yourself."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        _, created = Follow.objects.get_or_create(
            follower=request.user,
            following=target,
        )
        return Response({"following": True, "created": created})

    def delete(self, request, username):
        target = get_object_or_404(User, username=username)
        deleted_count, _ = Follow.objects.filter(
            follower=request.user,
            following=target,
        ).delete()
        return Response({"following": False, "deleted": deleted_count > 0})


class PublicUserProfileView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, username):
        target = get_object_or_404(User, username=username)
        follower_count = Follow.objects.filter(following=target).count()
        following_count = Follow.objects.filter(follower=target).count()
        post_count = MessagePost.objects.filter(author=target, is_public=True).count()
        is_following = False
        if request.user.is_authenticated and request.user.id != target.id:
            is_following = Follow.objects.filter(
                follower=request.user,
                following=target,
            ).exists()

        return Response(
            {
                "username": target.username,
                "follower_count": follower_count,
                "following_count": following_count,
                "post_count": post_count,
                "is_following": is_following,
            }
        )


class PublicBoomerWallView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        sort = request.query_params.get("sort", "top")
        rows = list(
            Boomer.objects.annotate(
                total_sessions=Count("boomer_sessions"),
                total_cost=Coalesce(Sum("boomer_sessions__cost"), 0),
                last_session_at=Max("boomer_sessions__end"),
            ).filter(total_sessions__gt=0)
        )

        boomer_ids = [row.id for row in rows]
        top_category_map = {}
        if boomer_ids:
            category_rows = (
                Session.objects.filter(boomer_id__in=boomer_ids)
                .values("boomer_id", "category__name")
                .annotate(
                    category_cost=Coalesce(Sum("cost"), 0), category_count=Count("id")
                )
                .order_by(
                    "boomer_id", "-category_cost", "-category_count", "category__name"
                )
            )
            for item in category_rows:
                key = str(item["boomer_id"])
                if key not in top_category_map:
                    top_category_map[key] = item["category__name"]

        if sort == "new":
            rows.sort(
                key=lambda item: item.last_session_at
                or datetime.min.replace(tzinfo=timezone.utc),
                reverse=True,
            )
        else:
            rows.sort(key=lambda item: item.total_cost, reverse=True)

        payload = []
        for index, row in enumerate(rows[:100]):
            payload.append(
                {
                    "rank": index + 1,
                    "boomer_id": str(row.id),
                    "name": row.name,
                    "lifetime_damage": row.total_cost,
                    "top_category": top_category_map.get(str(row.id), "Unknown"),
                }
            )

        return Response(payload)
