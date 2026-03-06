from django.shortcuts import render
from rest_framework import permissions
from rest_framework import renderers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet
# Create your views here.
from boomers.models import Boomer, Category, Session
from boomers.permissions import IsOwnerOrReadOnly 
from .serializers import CategorySerializer, BoomerSerializer, SessionSerializer

class CategoryViewSet(ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

class BoomerViewSet(ModelViewSet):
    queryset = Boomer.objects.all()
    serializer_class = BoomerSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

class SessionViewSet(ModelViewSet):
    queryset =  Session.objects.all()
    serializer_class = SessionSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
