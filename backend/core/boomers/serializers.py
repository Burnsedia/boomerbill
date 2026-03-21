from rest_framework import serializers
from django.db import models

from .models import Category, Session, Boomer


class CategorySerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)

    def validate_name(self, value):
        cleaned = " ".join(value.strip().split())
        if not cleaned:
            raise serializers.ValidationError("Category name is required.")
        if len(cleaned) > 80:
            raise serializers.ValidationError(
                "Category name must be 80 characters or less."
            )
        return cleaned

    class Meta:
        model = Category
        fields = (
            "id",
            "name",
            "is_default",
            "is_shared",
            "owner",
            "owner_username",
            "normalized_name",
        )
        read_only_fields = ("owner", "owner_username", "normalized_name")


class BoomerSerializer(serializers.ModelSerializer):
    total_sessions = serializers.IntegerField(read_only=True)
    total_minutes = serializers.IntegerField(read_only=True)
    total_cost = serializers.IntegerField(read_only=True)
    avg_minutes = serializers.FloatField(read_only=True)
    avg_cost = serializers.FloatField(read_only=True)
    last_session_at = serializers.DateTimeField(read_only=True, allow_null=True)

    class Meta:
        model = Boomer
        fields = (
            "id",
            "name",
            "cost",
            "total_sessions",
            "total_minutes",
            "total_cost",
            "avg_minutes",
            "avg_cost",
            "last_session_at",
        )


class SessionSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        start = attrs.get("start")
        end = attrs.get("end")
        minutes = attrs.get("minutes")
        cost = attrs.get("cost")

        if start and end and end <= start:
            raise serializers.ValidationError(
                "Session end time must be after start time."
            )
        if minutes is not None and minutes < 0:
            raise serializers.ValidationError("Minutes must be non-negative.")
        if cost is not None and cost < 0:
            raise serializers.ValidationError("Cost must be non-negative.")

        request = self.context.get("request")
        category = attrs.get("category") or getattr(self.instance, "category", None)
        if request and request.user and request.user.is_authenticated and category:
            category_allowed = Category.objects.filter(
                models.Q(id=category.id),
                models.Q(is_default=True)
                | models.Q(owner=request.user)
                | models.Q(is_shared=True),
            ).exists()
            if not category_allowed:
                raise serializers.ValidationError(
                    "You cannot use a category that belongs to another user."
                )

        return attrs

    class Meta:
        model = Session
        fields = "__all__"
        read_only_fields = ("owner",)
