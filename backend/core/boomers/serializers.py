from rest_framework import serializers

from .models import Category, Session, Boomer


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"


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

        return attrs

    class Meta:
        model = Session
        fields = "__all__"
        read_only_fields = ("owner",)
