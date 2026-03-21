import uuid
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Boomer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    cost = models.IntegerField(default=0)

    def __str__(self):
        return self.name


class Category(models.Model):
    id = models.CharField(max_length=100, primary_key=True)
    name = models.CharField(max_length=255)
    is_default = models.BooleanField(default=False)
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="owned_categories",
        null=True,
        blank=True,
    )
    is_shared = models.BooleanField(default=False)
    normalized_name = models.CharField(max_length=255, db_index=True, default="")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "normalized_name"],
                condition=models.Q(owner__isnull=False),
                name="unique_owner_normalized_category",
            )
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        self.name = self.name.strip()
        self.normalized_name = " ".join(self.name.lower().split())
        super().save(*args, **kwargs)


class Session(models.Model):
    owner = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="victim_sessions"
    )
    boomer = models.ForeignKey(
        Boomer, on_delete=models.CASCADE, related_name="boomer_sessions"
    )
    category = models.ForeignKey(
        Category, on_delete=models.CASCADE, related_name="category_sessions"
    )

    # NOTE: Cost in time (seconds)
    minutes = models.IntegerField()
    # NOTE: Cost in pennies
    cost = models.IntegerField()
    start = models.DateTimeField()
    end = models.DateTimeField()
    note = models.TextField(blank=True)
