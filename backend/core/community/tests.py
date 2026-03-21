from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from boomers.models import Boomer, Category, Session
from community.models import Follow, MessagePost, MessageReply


class CommunityApiTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(
            username="alice", password="strong-pass"
        )
        self.other = user_model.objects.create_user(
            username="bob", password="strong-pass"
        )
        self.token = Token.objects.create(user=self.user)
        self.category = Category.objects.create(
            id="general", name="General", is_default=True
        )
        self.boomer = Boomer.objects.create(name="Dad", cost=0)

        Session.objects.create(
            owner=self.user,
            boomer=self.boomer,
            category=self.category,
            minutes=20,
            cost=4000,
            start="2026-03-20T10:00:00Z",
            end="2026-03-20T10:20:00Z",
            note="router",
        )
        Session.objects.create(
            owner=self.other,
            boomer=self.boomer,
            category=self.category,
            minutes=10,
            cost=1000,
            start="2026-03-20T11:00:00Z",
            end="2026-03-20T11:10:00Z",
            note="printer",
        )

    def test_public_can_read_leaderboard_and_messages(self):
        MessagePost.objects.create(author=self.user, body="hello world", is_public=True)

        leaderboard = self.client.get("/api/public/leaderboard/users/")
        messages = self.client.get("/api/public/messages/")
        wall = self.client.get("/api/public/wall/boomers/")

        self.assertEqual(leaderboard.status_code, 200)
        self.assertEqual(messages.status_code, 200)
        self.assertEqual(wall.status_code, 200)
        self.assertGreaterEqual(len(leaderboard.data), 2)
        self.assertEqual(messages.data[0]["body"], "hello world")
        self.assertEqual(wall.data[0]["name"], "Dad")

    def test_guest_cannot_post_or_follow(self):
        post_response = self.client.post(
            "/api/messages/", {"body": "hi"}, format="json"
        )
        follow_response = self.client.post("/api/follows/bob/")
        following_feed = self.client.get("/api/public/messages/?scope=following")

        self.assertEqual(post_response.status_code, 401)
        self.assertEqual(follow_response.status_code, 401)
        self.assertEqual(following_feed.status_code, 401)

    def test_authenticated_user_can_post_and_follow(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

        post_response = self.client.post(
            "/api/messages/", {"body": "new post"}, format="json"
        )
        follow_response = self.client.post("/api/follows/bob/")
        unfollow_response = self.client.delete("/api/follows/bob/")

        self.assertEqual(post_response.status_code, 201)
        self.assertEqual(follow_response.status_code, 200)
        self.assertEqual(unfollow_response.status_code, 200)
        self.assertFalse(
            Follow.objects.filter(follower=self.user, following=self.other).exists()
        )

    def test_authenticated_user_can_reply_to_message(self):
        post = MessagePost.objects.create(
            author=self.other, body="base post", is_public=True
        )

        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")
        reply_response = self.client.post(
            f"/api/messages/{post.id}/replies/",
            {"body": "first reply"},
            format="json",
        )
        list_response = self.client.get(f"/api/public/messages/{post.id}/replies/")

        self.assertEqual(reply_response.status_code, 201)
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]["body"], "first reply")
        self.assertTrue(MessageReply.objects.filter(post=post).exists())

    def test_following_scope_filters_messages(self):
        MessagePost.objects.create(author=self.other, body="from bob", is_public=True)
        MessagePost.objects.create(author=self.user, body="from alice", is_public=True)

        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")
        Follow.objects.create(follower=self.user, following=self.other)

        response = self.client.get("/api/public/messages/?scope=following")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["author_username"], "bob")

    def test_user_cannot_follow_self(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

        follow_response = self.client.post("/api/follows/alice/")

        self.assertEqual(follow_response.status_code, 400)
