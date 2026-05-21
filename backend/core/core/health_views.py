"""Lightweight health check views for container / cloud liveness probes."""

from django.http import JsonResponse


def healthz(request):
    """Return a minimal 200 OK response for liveness checks.

    This endpoint deliberately avoids database queries or any heavy work so
    that orchestrators (Fly.io, Kubernetes, etc.) can quickly determine
    whether the process is alive without adding load.
    """
    return JsonResponse({"status": "ok"}, status=200)
