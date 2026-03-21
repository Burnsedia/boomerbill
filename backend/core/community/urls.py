from django.urls import path

from .views import (
    FollowUserView,
    MessageCreateView,
    MessageReplyCreateView,
    PublicBoomerWallView,
    PublicMessageRepliesView,
    PublicMessagesView,
    PublicUserLeaderboardView,
    PublicUserProfileView,
)

urlpatterns = [
    path("public/leaderboard/users/", PublicUserLeaderboardView.as_view()),
    path("public/messages/", PublicMessagesView.as_view()),
    path("public/messages/<int:post_id>/replies/", PublicMessageRepliesView.as_view()),
    path("public/wall/boomers/", PublicBoomerWallView.as_view()),
    path("messages/", MessageCreateView.as_view()),
    path("messages/<int:post_id>/replies/", MessageReplyCreateView.as_view()),
    path("follows/<str:username>/", FollowUserView.as_view()),
    path("public/users/<str:username>/", PublicUserProfileView.as_view()),
]
