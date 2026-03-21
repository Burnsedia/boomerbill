from django.contrib import admin

from .models import Follow, MessagePost


@admin.register(MessagePost)
class MessagePostAdmin(admin.ModelAdmin):
    list_display = ("id", "author", "created_at", "is_public")
    search_fields = ("author__username", "body")


@admin.register(Follow)
class FollowAdmin(admin.ModelAdmin):
    list_display = ("id", "follower", "following", "created_at")
    search_fields = ("follower__username", "following__username")
