from rest_framework import serializers

from .models import MessagePost, MessageReply


class MessagePostSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True)
    reply_count = serializers.IntegerField(read_only=True)
    hot_score = serializers.FloatField(read_only=True)

    class Meta:
        model = MessagePost
        fields = (
            "id",
            "author_username",
            "body",
            "created_at",
            "reply_count",
            "hot_score",
        )


class MessagePostCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessagePost
        fields = ("body",)


class MessageReplySerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True)

    class Meta:
        model = MessageReply
        fields = ("id", "author_username", "body", "created_at")


class MessageReplyCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MessageReply
        fields = ("body",)
