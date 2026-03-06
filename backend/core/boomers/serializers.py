from rest_framework import serializers

from .models import Category, Session, Boomer

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = "__all__"

class BoomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Boomer
        fields = "__all__"

class SessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = "__all__"

