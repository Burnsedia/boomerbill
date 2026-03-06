from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BoomerViewSet, CategoryViewSet, SessionViewSet

router = DefaultRouter()
router.register(r'boomers', BoomerViewSet, basename="boomers")
router.register(r'category', CategoryViewSet, basename="category")
router.register(r'sessions', SessionViewSet, basename="sessions")

urlpatterns = [
    path('', include(router.urls)),
]
