import random
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone
from rest_framework.authtoken.models import Token

from boomers.models import Boomer, Category, Session
from community.models import Follow, MessagePost, MessageReply


class Command(BaseCommand):
    help = "Create dumb test data for local development"

    def add_arguments(self, parser):
        parser.add_argument(
            "--size",
            default="medium",
            choices=["small", "medium", "large"],
            help="How much dummy data to generate",
        )

    def handle(self, *args, **options):
        size = options["size"]
        scale = {"small": 1, "medium": 2, "large": 4}[size]

        user_model = get_user_model()
        usernames = ["alice", "bob", "charlie", "dana", "eli"]
        users = []
        for username in usernames:
            user, created = user_model.objects.get_or_create(username=username)
            if created:
                user.set_password("testpass123")
                user.save(update_fields=["password"])
            Token.objects.get_or_create(user=user)
            users.append(user)

        category_specs = [
            ("general", "General", True),
            ("wifi", "WiFi", True),
            ("printer", "Printer", True),
            ("password", "Password", True),
            ("email", "Email", True),
            ("software", "Software", True),
        ]
        categories = []
        for category_id, name, is_default in category_specs:
            category, _ = Category.objects.get_or_create(
                id=category_id,
                defaults={"name": name, "is_default": is_default},
            )
            categories.append(category)

        boomer_names = [
            "Dad",
            "Mom",
            "Uncle Dave",
            "Neighbor Carl",
            "Boss",
            "Aunt Linda",
            "Grandpa Joe",
        ]
        boomers = []
        for name in boomer_names:
            boomer, _ = Boomer.objects.get_or_create(name=name, defaults={"cost": 0})
            boomers.append(boomer)

        notes = [
            "Printer says offline but it is right there",
            "Forgot password again",
            "Email disappeared from desktop",
            "WiFi slower than dial-up",
            "Installed toolbar by accident",
            "Cannot find the Any key",
            "Laptop had 78 browser tabs",
            "Zoom camera upside down",
        ]

        sessions_target = 25 * scale
        existing_sessions = Session.objects.count()
        sessions_to_create = max(0, sessions_target - existing_sessions)
        now = timezone.now()

        for _ in range(sessions_to_create):
            owner = random.choice(users)
            boomer = random.choice(boomers)
            category = random.choice(categories)
            minutes = random.randint(5, 120)
            end = now - timedelta(hours=random.randint(1, 24 * 14))
            start = end - timedelta(minutes=minutes)
            cost = int(round((minutes / 60) * random.choice([3500, 5000, 7500, 10000])))

            Session.objects.create(
                owner=owner,
                boomer=boomer,
                category=category,
                minutes=minutes,
                cost=cost,
                start=start,
                end=end,
                note=random.choice(notes),
            )

        posts_target = 12 * scale
        existing_posts = MessagePost.objects.count()
        posts_to_create = max(0, posts_target - existing_posts)
        posts = list(MessagePost.objects.all())

        for _ in range(posts_to_create):
            post = MessagePost.objects.create(
                author=random.choice(users),
                body=random.choice(notes) + " #" + str(random.randint(10, 999)),
                is_public=True,
            )
            posts.append(post)

        replies_target = 20 * scale
        existing_replies = MessageReply.objects.count()
        replies_to_create = max(0, replies_target - existing_replies)
        if posts:
            for _ in range(replies_to_create):
                MessageReply.objects.create(
                    post=random.choice(posts),
                    author=random.choice(users),
                    body="reply: " + random.choice(notes),
                )

        for follower in users:
            for following in users:
                if follower.id == following.id:
                    continue
                if random.random() < 0.35:
                    Follow.objects.get_or_create(follower=follower, following=following)

        self.stdout.write(self.style.SUCCESS("Dummy data seeded."))
        self.stdout.write("Users: alice, bob, charlie, dana, eli")
        self.stdout.write("Password for all: testpass123")
