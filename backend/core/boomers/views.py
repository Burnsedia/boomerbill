from rest_framework import permissions
from rest_framework.viewsets import ModelViewSet

from boomers.models import Boomer, Category, Session
from boomers.permissions import IsOwnerOrReadOnly
from .serializers import CategorySerializer, BoomerSerializer, SessionSerializer


class CategoryViewSet(ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class BoomerViewSet(ModelViewSet):
    queryset = Boomer.objects.all()
    serializer_class = BoomerSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class SessionViewSet(ModelViewSet):
    serializer_class = SessionSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Session.objects.all()
        return Session.objects.filter(owner=user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
