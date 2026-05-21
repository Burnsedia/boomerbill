#!/usr/bin/env python
"""
Benchmark harness for BoomerBill backend performance.

Benchmarks hot endpoints for query count, latency (p50/p95/p99), and
EXPLAIN ANALYZE on critical queries (PostgreSQL only).

Usage:
    python scripts/benchmark.py                  # 20 runs, ASCII table
    python scripts/benchmark.py --runs 50         # 50 runs
    python scripts/benchmark.py --json            # JSON output
    python scripts/benchmark.py --runs 30 --json  # Combined
"""

import argparse
import json
import math
import os
import random
import statistics
import sys
import time
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone as _pytz
from typing import Any

# ---------------------------------------------------------------------------
# Django setup — must happen before any Django imports
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(BASE_DIR, "core"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")

import django

django.setup()

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import connection, reset_queries
from django.test import RequestFactory, override_settings
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.parsers import JSONParser
from rest_framework.request import Request
from rest_framework.test import APIRequestFactory, force_authenticate

from boomers.models import Boomer, Category, Session
from boomers.views import BoomerViewSet, SessionViewSet, SyncPushView
from community.models import MessagePost, MessageReply
from community.views import PublicBoomerWallView

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
DEFAULT_RUNS = 20
MIN_DATA_FOR_BENCHMARK = {
    "boomers": 5,
    "sessions": 20,
    "categories": 3,
    "users": 2,
    "posts": 5,
}

BOOMER_NAMES = [
    "Dad", "Mom", "Uncle Dave", "Neighbor Carl", "Boss",
    "Aunt Linda", "Grandpa Joe", "Cousin Steve", "Grandma Rose",
]
CATEGORY_SPECS = [
    ("general", "General", True),
    ("wifi", "WiFi", True),
    ("printer", "Printer", True),
    ("password", "Password", True),
    ("email", "Email", True),
]
NOTES = [
    "Printer says offline but it is right there",
    "Forgot password again",
    "Email disappeared from desktop",
    "WiFi slower than dial-up",
    "Installed toolbar by accident",
    "Cannot find the Any key",
    "Laptop had 78 browser tabs",
    "Zoom camera upside down",
]


# ---------------------------------------------------------------------------
# Data seeding
# ---------------------------------------------------------------------------
def _ensure_test_data() -> dict:
    """Seed minimal test data if the database is empty. Returns counts."""
    User = get_user_model()

    # Users
    if User.objects.count() < MIN_DATA_FOR_BENCHMARK["users"]:
        for username in ["bench_alice", "bench_bob"]:
            user, created = User.objects.get_or_create(username=username)
            if created:
                user.set_password("benchpass123")
                user.save(update_fields=["password"])
            Token.objects.get_or_create(user=user)

    # Categories
    if Category.objects.count() < MIN_DATA_FOR_BENCHMARK["categories"]:
        for cid, name, is_default in CATEGORY_SPECS:
            Category.objects.get_or_create(
                id=cid, defaults={"name": name, "is_default": is_default}
            )

    # Boomers
    if Boomer.objects.count() < MIN_DATA_FOR_BENCHMARK["boomers"]:
        for name in BOOMER_NAMES:
            Boomer.objects.get_or_create(name=name, defaults={"cost": 0})

    # Sessions
    if Session.objects.count() < MIN_DATA_FOR_BENCHMARK["sessions"]:
        users = list(User.objects.all())
        boomers = list(Boomer.objects.all())
        categories = list(Category.objects.all())
        now = timezone.now()

        for i in range(MIN_DATA_FOR_BENCHMARK["sessions"]):
            minutes = random.randint(5, 120)
            end = now - timedelta(hours=random.randint(1, 168))
            start = end - timedelta(minutes=minutes)
            cost = int(round((minutes / 60) * random.choice([3500, 5000, 7500])))
            Session.objects.create(
                owner=random.choice(users),
                boomer=random.choice(boomers),
                category=random.choice(categories),
                minutes=minutes,
                cost=cost,
                start=start,
                end=end,
                note=random.choice(NOTES),
            )

    # Posts
    if MessagePost.objects.count() < MIN_DATA_FOR_BENCHMARK["posts"]:
        users = list(User.objects.all())
        for i in range(MIN_DATA_FOR_BENCHMARK["posts"]):
            MessagePost.objects.create(
                author=random.choice(users),
                body=random.choice(NOTES) + f" #{random.randint(10, 999)}",
                is_public=True,
            )

    return {
        "users": User.objects.count(),
        "boomers": Boomer.objects.count(),
        "sessions": Session.objects.count(),
        "categories": Category.objects.count(),
        "posts": MessagePost.objects.count(),
    }


# ---------------------------------------------------------------------------
# Query tracking
# ---------------------------------------------------------------------------
@contextmanager
def track_queries():
    """Context manager that captures query count and SQL statements."""
    from django.conf import settings as django_settings

    # Ensure DEBUG is on so queries are captured
    original_debug = django_settings.DEBUG
    django_settings.DEBUG = True
    reset_queries()

    queries_before = len(connection.queries)
    start = time.perf_counter()

    result = {}
    try:
        yield result
    finally:
        elapsed = time.perf_counter() - start
        queries_after = len(connection.queries)
        query_count = queries_after - queries_before
        django_settings.DEBUG = original_debug

        result["query_count"] = query_count
        result["elapsed"] = elapsed
        result["queries"] = list(connection.queries[queries_before:])


# ---------------------------------------------------------------------------
# Percentile helpers
# ---------------------------------------------------------------------------
def percentile(data: list[float], pct: float) -> float:
    """Calculate the given percentile from a sorted list."""
    if not data:
        return 0.0
    sorted_data = sorted(data)
    k = (len(sorted_data) - 1) * (pct / 100.0)
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return sorted_data[int(k)]
    d0 = sorted_data[int(f)] * (c - k)
    d1 = sorted_data[int(c)] * (k - f)
    return d0 + d1


def fmt_ms(seconds: float) -> str:
    """Format seconds as milliseconds with 2 decimal places."""
    return f"{seconds * 1000:.2f}ms"


# ---------------------------------------------------------------------------
# Endpoint benchmark functions
# ---------------------------------------------------------------------------
def _get_authenticated_user():
    """Get or create a benchmark user for authenticated endpoints."""
    User = get_user_model()
    user, _ = User.objects.get_or_create(username="bench_alice")
    return user


def _build_sync_push_payload() -> dict:
    """Build a realistic sync/push payload."""
    users = list(get_user_model().objects.all()[:2])
    boomers = list(Boomer.objects.all()[:3])
    categories = list(Category.objects.all()[:3])
    now = timezone.now()

    sessions = []
    for i in range(5):
        minutes = random.randint(10, 90)
        end = now - timedelta(hours=random.randint(1, 48))
        start = end - timedelta(minutes=minutes)
        sessions.append({
            "boomerId": str(boomers[i % len(boomers)].id),
            "categoryId": categories[i % len(categories)].id,
            "minutes": minutes,
            "cost": round(minutes / 60 * 75, 2),
            "startedAt": int(start.timestamp() * 1000),
            "endedAt": int(end.timestamp() * 1000),
            "note": random.choice(NOTES),
        })

    return {
        "boomers": [{"id": str(b.id), "name": b.name} for b in boomers],
        "categories": [
            {"id": c.id, "name": c.name, "isDefault": c.is_default, "isShared": c.is_shared}
            for c in categories
        ],
        "sessions": sessions,
    }


def benchmark_boomer_list(runs: int) -> dict:
    """Benchmark BoomerViewSet list endpoint."""
    factory = APIRequestFactory()
    latencies = []
    query_counts = []

    for _ in range(runs):
        wsgi_request = factory.get("/api/boomers/")
        request = Request(wsgi_request)

        with track_queries() as result:
            view = BoomerViewSet(request=request)
            view.action = "list"
            view.format_kwarg = None
            response = view.list(request)

        latencies.append(result["elapsed"])
        query_counts.append(result["query_count"])

    return {
        "endpoint": "GET /api/boomers/",
        "description": "BoomerViewSet list (annotated with session stats)",
        "runs": runs,
        "latency": {
            "p50": percentile(latencies, 50),
            "p95": percentile(latencies, 95),
            "p99": percentile(latencies, 99),
            "min": min(latencies),
            "max": max(latencies),
            "mean": statistics.mean(latencies),
        },
        "query_count": {
            "p50": percentile(query_counts, 50),
            "p95": percentile(query_counts, 95),
            "p99": percentile(query_counts, 99),
            "min": min(query_counts),
            "max": max(query_counts),
            "mean": statistics.mean(query_counts),
        },
    }


def benchmark_session_list(runs: int) -> dict:
    """Benchmark SessionViewSet list endpoint (authenticated)."""
    factory = APIRequestFactory()
    user = _get_authenticated_user()
    latencies = []
    query_counts = []

    for _ in range(runs):
        wsgi_request = factory.get("/api/sessions/")
        force_authenticate(wsgi_request, user=user)
        request = Request(wsgi_request)

        with track_queries() as result:
            view = SessionViewSet(request=request)
            view.action = "list"
            view.format_kwarg = None
            response = view.list(request)

        latencies.append(result["elapsed"])
        query_counts.append(result["query_count"])

    return {
        "endpoint": "GET /api/sessions/",
        "description": "SessionViewSet list (authenticated, owner-filtered)",
        "runs": runs,
        "latency": {
            "p50": percentile(latencies, 50),
            "p95": percentile(latencies, 95),
            "p99": percentile(latencies, 99),
            "min": min(latencies),
            "max": max(latencies),
            "mean": statistics.mean(latencies),
        },
        "query_count": {
            "p50": percentile(query_counts, 50),
            "p95": percentile(query_counts, 95),
            "p99": percentile(query_counts, 99),
            "min": min(query_counts),
            "max": max(query_counts),
            "mean": statistics.mean(query_counts),
        },
    }


def benchmark_sync_push(runs: int) -> dict:
    """Benchmark SyncPushView endpoint (authenticated)."""
    factory = APIRequestFactory()
    user = _get_authenticated_user()
    payload = _build_sync_push_payload()
    latencies = []
    query_counts = []

    for _ in range(runs):
        wsgi_request = factory.post(
            "/api/sync/push/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        force_authenticate(wsgi_request, user=user)
        request = Request(wsgi_request, parsers=[JSONParser()])

        with track_queries() as result:
            view = SyncPushView()
            response = view.post(request)

        latencies.append(result["elapsed"])
        query_counts.append(result["query_count"])

    return {
        "endpoint": "POST /api/sync/push/",
        "description": "SyncPush (bulk upsert of boomers, categories, sessions)",
        "runs": runs,
        "latency": {
            "p50": percentile(latencies, 50),
            "p95": percentile(latencies, 95),
            "p99": percentile(latencies, 99),
            "min": min(latencies),
            "max": max(latencies),
            "mean": statistics.mean(latencies),
        },
        "query_count": {
            "p50": percentile(query_counts, 50),
            "p95": percentile(query_counts, 95),
            "p99": percentile(query_counts, 99),
            "min": min(query_counts),
            "max": max(query_counts),
            "mean": statistics.mean(query_counts),
        },
    }


def benchmark_public_boomer_wall(runs: int) -> dict:
    """Benchmark PublicBoomerWallView endpoint (public)."""
    factory = APIRequestFactory()
    latencies = []
    query_counts = []

    for _ in range(runs):
        wsgi_request = factory.get("/api/public/wall/boomers/")
        request = Request(wsgi_request)

        with track_queries() as result:
            view = PublicBoomerWallView()
            response = view.get(request)

        latencies.append(result["elapsed"])
        query_counts.append(result["query_count"])

    return {
        "endpoint": "GET /api/public/wall/boomers/",
        "description": "PublicBoomerWall (annotated boomer leaderboard)",
        "runs": runs,
        "latency": {
            "p50": percentile(latencies, 50),
            "p95": percentile(latencies, 95),
            "p99": percentile(latencies, 99),
            "min": min(latencies),
            "max": max(latencies),
            "mean": statistics.mean(latencies),
        },
        "query_count": {
            "p50": percentile(query_counts, 50),
            "p95": percentile(query_counts, 95),
            "p99": percentile(query_counts, 99),
            "min": min(query_counts),
            "max": max(query_counts),
            "mean": statistics.mean(query_counts),
        },
    }


# ---------------------------------------------------------------------------
# EXPLAIN ANALYZE
# ---------------------------------------------------------------------------
def _is_postgresql() -> bool:
    """Check if the current database is PostgreSQL."""
    return connection.vendor == "postgresql"


def run_explain_analyze() -> list[dict]:
    """Run EXPLAIN ANALYZE on critical queries (PostgreSQL only)."""
    if not _is_postgresql():
        return []

    results = []

    # Critical queries to analyze
    queries = [
        {
            "name": "Boomer list annotations",
            "sql": """
                EXPLAIN ANALYZE
                SELECT "boomers_boomer"."id", "boomers_boomer"."name",
                       COUNT("boomers_session"."id") AS total_sessions,
                       COALESCE(SUM("boomers_session"."minutes"), 0) AS total_minutes,
                       COALESCE(SUM("boomers_session"."cost"), 0) AS total_cost
                FROM "boomers_boomer"
                LEFT OUTER JOIN "boomers_session"
                    ON ("boomers_boomer"."id" = "boomers_session"."boomer_id")
                GROUP BY "boomers_boomer"."id"
            """,
        },
        {
            "name": "Public boomer wall (cost-sorted)",
            "sql": """
                EXPLAIN ANALYZE
                SELECT "boomers_boomer"."id", "boomers_boomer"."name",
                       COUNT("boomers_session"."id") AS total_sessions,
                       COALESCE(SUM("boomers_session"."cost"), 0) AS total_cost,
                       MAX("boomers_session"."end") AS last_session_at
                FROM "boomers_boomer"
                LEFT OUTER JOIN "boomers_session"
                    ON ("boomers_boomer"."id" = "boomers_session"."boomer_id")
                GROUP BY "boomers_boomer"."id"
                HAVING COUNT("boomers_session"."id") > 0
                ORDER BY total_cost DESC
                LIMIT 100
            """,
        },
        {
            "name": "Session owner lookup",
            "sql": """
                EXPLAIN ANALYZE
                SELECT "boomers_session"."id", "boomers_session"."owner_id",
                       "boomers_session"."boomer_id", "boomers_session"."category_id",
                       "boomers_session"."minutes", "boomers_session"."cost",
                       "boomers_session"."start", "boomers_session"."end",
                       "boomers_session"."note"
                FROM "boomers_session"
                INNER JOIN "boomers_boomer"
                    ON ("boomers_session"."boomer_id" = "boomers_boomer"."id")
                INNER JOIN "boomers_category"
                    ON ("boomers_session"."category_id" = "boomers_category"."id")
                WHERE "boomers_session"."owner_id" = 1
                ORDER BY "boomers_session"."start" DESC
                LIMIT 50
            """,
        },
        {
            "name": "User leaderboard aggregation",
            "sql": """
                EXPLAIN ANALYZE
                SELECT "boomers_session"."owner_id",
                       COUNT("boomers_session"."id") AS total_sessions,
                       COALESCE(SUM("boomers_session"."minutes"), 0) AS total_minutes,
                       COALESCE(SUM("boomers_session"."cost"), 0) AS total_cost
                FROM "boomers_session"
                GROUP BY "boomers_session"."owner_id", "auth_user"."username"
                ORDER BY total_cost DESC, total_minutes DESC
                LIMIT 100
            """,
        },
    ]

    from django.db import connections

    for query in queries:
        try:
            with connections["default"].cursor() as cursor:
                cursor.execute(query["sql"])
                rows = cursor.fetchall()
                # EXPLAIN ANALYZE returns text rows
                plan = "\n".join(row[0] for row in rows)
                results.append({
                    "query_name": query["name"],
                    "plan": plan,
                })
        except Exception as e:
            results.append({
                "query_name": query["name"],
                "plan": f"ERROR: {e}",
            })

    return results


# ---------------------------------------------------------------------------
# Output formatting
# ---------------------------------------------------------------------------
def _ascii_table(results: list[dict]) -> str:
    """Render benchmark results as an ASCII table."""
    lines = []
    lines.append("=" * 90)
    lines.append("  BOOMERBILL BACKEND BENCHMARK RESULTS")
    lines.append(f"  Date: {datetime.now(_pytz.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    lines.append(f"  Database: {connection.vendor} ({connection.settings_dict['NAME']})")
    lines.append("=" * 90)
    lines.append("")

    for r in results:
        lat = r["latency"]
        qry = r["query_count"]
        lines.append(f"  {r['endpoint']}")
        lines.append(f"  {r['description']}")
        lines.append("-" * 90)
        lines.append(
            f"  {'Metric':<20} | {'p50':>10} | {'p95':>10} | {'p99':>10} | {'min':>10} | {'max':>10}"
        )
        lines.append(f"  {'-'*20}-+-{'-'*10}-+-{'-'*10}-+-{'-'*10}-+-{'-'*10}-+-{'-'*10}")
        lines.append(
            f"  {'Latency':<20} | {fmt_ms(lat['p50']):>10} | {fmt_ms(lat['p95']):>10} | {fmt_ms(lat['p99']):>10} | {fmt_ms(lat['min']):>10} | {fmt_ms(lat['max']):>10}"
        )
        lines.append(
            f"  {'Query Count':<20} | {qry['p50']:>10.0f} | {qry['p95']:>10.0f} | {qry['p99']:>10.0f} | {qry['min']:>10.0f} | {qry['max']:>10.0f}"
        )
        lines.append("")

    return "\n".join(lines)


def _explain_table(explain_results: list[dict]) -> str:
    """Render EXPLAIN ANALYZE results."""
    if not explain_results:
        return "  EXPLAIN ANALYZE: Skipped (PostgreSQL required)\n"

    lines = []
    lines.append("=" * 90)
    lines.append("  EXPLAIN ANALYZE — Critical Query Plans")
    lines.append("=" * 90)
    lines.append("")

    for result in explain_results:
        lines.append(f"  Query: {result['query_name']}")
        lines.append("-" * 90)
        for plan_line in result["plan"].split("\n"):
            lines.append(f"  {plan_line}")
        lines.append("")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="Benchmark BoomerBill backend endpoints"
    )
    parser.add_argument(
        "--runs",
        type=int,
        default=DEFAULT_RUNS,
        help=f"Number of benchmark runs per endpoint (default: {DEFAULT_RUNS})",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output results as JSON instead of ASCII table",
    )
    args = parser.parse_args()

    runs = args.runs
    if runs < 1:
        print("Error: --runs must be at least 1", file=sys.stderr)
        sys.exit(1)

    # Ensure test data exists
    print(f"Checking test data...")
    data_counts = _ensure_test_data()
    print(f"  Users: {data_counts['users']}, Boomers: {data_counts['boomers']}, "
          f"Sessions: {data_counts['sessions']}, Categories: {data_counts['categories']}, "
          f"Posts: {data_counts['posts']}")
    print(f"Running {runs} iterations per endpoint...\n")

    # Run benchmarks
    benchmarks = [
        benchmark_boomer_list(runs),
        benchmark_session_list(runs),
        benchmark_sync_push(runs),
        benchmark_public_boomer_wall(runs),
    ]

    # EXPLAIN ANALYZE
    explain_results = run_explain_analyze()

    # Output
    if args.json:
        output = {
            "timestamp": datetime.now(_pytz.utc).isoformat(),
            "database": {
                "vendor": connection.vendor,
                "name": connection.settings_dict["NAME"],
            },
            "runs": runs,
            "benchmarks": benchmarks,
            "explain_analyze": explain_results,
        }
        print(json.dumps(output, indent=2))
    else:
        print(_ascii_table(benchmarks))
        if explain_results:
            print(_explain_table(explain_results))

    # Summary
    total_queries = sum(b["query_count"]["mean"] for b in benchmarks)
    total_latency = sum(b["latency"]["mean"] for b in benchmarks)
    print(f"  SUMMARY: {len(benchmarks)} endpoints, {runs} runs each")
    print(f"  Avg total latency: {fmt_ms(total_latency)}")
    print(f"  Avg total queries: {total_queries:.1f}")


if __name__ == "__main__":
    main()
