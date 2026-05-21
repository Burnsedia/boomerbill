"""Django settings for core project."""

from datetime import timedelta
from pathlib import Path
from urllib.parse import urlparse

import environ
from django.core.exceptions import ImproperlyConfigured

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/6.0/howto/deployment/checklist/

env = environ.Env()
environ.Env.read_env(BASE_DIR.parent / ".env")



def _looks_like_placeholder_secret(value: str) -> bool:
    normalized = (value or "").strip().lower()
    if not normalized:
        return True
    placeholder_tokens = (
        "replace-with",
        "replace_me",
        "changeme",
        "change-me",
        "example",
        "unsafe-dev-key",
    )
    return any(token in normalized for token in placeholder_tokens)



# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = env("DJANGO_SECRET_KEY", default="unsafe-dev-key")

DEBUG = env.bool("DJANGO_DEBUG", default=False)

default_allowed_hosts = ["127.0.0.1", "localhost", "0.0.0.0", "testserver"] if DEBUG else []
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=default_allowed_hosts)

if not DEBUG and _looks_like_placeholder_secret(SECRET_KEY):
    raise ImproperlyConfigured(
        "DJANGO_SECRET_KEY must be set to a real externally managed secret when DJANGO_DEBUG=False"
    )

if not DEBUG and not ALLOWED_HOSTS:
    raise ImproperlyConfigured("DJANGO_ALLOWED_HOSTS must be set when DJANGO_DEBUG=False")

# Application definition

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework.authtoken",
    "djoser",
    "boomers",
    "community",
    "users",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"


# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases

DATABASES = {
    "default": env.db("DATABASE_URL", default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}")
}

if (
    DATABASES["default"]["ENGINE"] == "django.db.backends.postgresql"
    and env.bool("DATABASE_SSL_REQUIRE", default=False)
):
    DATABASES["default"].setdefault("OPTIONS", {})["sslmode"] = "require"


# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# Internationalization
# https://docs.djangoproject.com/en/6.0/topics/i18n/

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.0/howto/static-files/

STATIC_URL = "static/"

AUTH_MODE = env("AUTH_MODE", default="dual").strip().lower()

ENABLE_LEGACY_TOKEN_AUTH = env.bool(
    "ENABLE_LEGACY_TOKEN_AUTH",
    default=AUTH_MODE in {"dual", "legacy", "legacy_token", "token"},
)
ENABLE_JWT_AUTH = env.bool(
    "ENABLE_JWT_AUTH",
    default=AUTH_MODE in {"dual", "jwt"},
)

if not ENABLE_LEGACY_TOKEN_AUTH and not ENABLE_JWT_AUTH:
    raise ImproperlyConfigured(
        "At least one auth mode must be enabled: ENABLE_LEGACY_TOKEN_AUTH or ENABLE_JWT_AUTH"
    )

JWT_ROTATE_REFRESH_TOKENS = env.bool("JWT_ROTATE_REFRESH_TOKENS", default=True)
JWT_BLACKLIST_AFTER_ROTATION = env.bool("JWT_BLACKLIST_AFTER_ROTATION", default=True)

if JWT_BLACKLIST_AFTER_ROTATION and not JWT_ROTATE_REFRESH_TOKENS:
    raise ImproperlyConfigured(
        "JWT_BLACKLIST_AFTER_ROTATION=True requires JWT_ROTATE_REFRESH_TOKENS=True"
    )

if ENABLE_JWT_AUTH and JWT_BLACKLIST_AFTER_ROTATION:
    INSTALLED_APPS.append("rest_framework_simplejwt.token_blacklist")

_authentication_classes = ["rest_framework.authentication.SessionAuthentication"]
if ENABLE_LEGACY_TOKEN_AUTH:
    _authentication_classes.insert(0, "rest_framework.authentication.TokenAuthentication")
if ENABLE_JWT_AUTH:
    _authentication_classes.insert(
        0,
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    )

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": tuple(_authentication_classes),
}

PASSWORD_RESET_CONFIRM_URL = env(
    "PASSWORD_RESET_CONFIRM_URL",
    default="reset-password?uid={uid}&token={token}",
).strip()

if "{uid}" not in PASSWORD_RESET_CONFIRM_URL or "{token}" not in PASSWORD_RESET_CONFIRM_URL:
    raise ImproperlyConfigured(
        "PASSWORD_RESET_CONFIRM_URL must contain both {uid} and {token} placeholders"
    )

parsed_password_reset_confirm_url = urlparse(PASSWORD_RESET_CONFIRM_URL)
if (
    parsed_password_reset_confirm_url.scheme
    or parsed_password_reset_confirm_url.netloc
):
    raise ImproperlyConfigured(
        "PASSWORD_RESET_CONFIRM_URL must be relative (no scheme or host)"
    )

DJOSER = {
    "SERIALIZERS": {
        "user_create": "users.serializers.EmailRequiredUserCreateSerializer",
    },
    "LOGIN_FIELD": "username",
    "PASSWORD_RESET_CONFIRM_URL": PASSWORD_RESET_CONFIRM_URL,
}

if not ENABLE_LEGACY_TOKEN_AUTH:
    DJOSER["TOKEN_MODEL"] = None

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(
        minutes=env.int("JWT_ACCESS_TOKEN_LIFETIME_MINUTES", default=15)
    ),
    "REFRESH_TOKEN_LIFETIME": timedelta(
        days=env.int("JWT_REFRESH_TOKEN_LIFETIME_DAYS", default=7)
    ),
    "ROTATE_REFRESH_TOKENS": JWT_ROTATE_REFRESH_TOKENS,
    "BLACKLIST_AFTER_ROTATION": JWT_BLACKLIST_AFTER_ROTATION,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "UPDATE_LAST_LOGIN": False,
}

DOMAIN = env("PUBLIC_DOMAIN", default="localhost:4321")
SITE_NAME = env("SITE_NAME", default="BoomerBill")

CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])
CORS_ALLOW_CREDENTIALS = env.bool("CORS_ALLOW_CREDENTIALS", default=False)

CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])

if DEBUG:
    default_dev_origins = [
        "http://localhost:4321",
        "http://127.0.0.1:4321",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    dev_cors_allowed_origins = env.list(
        "DEV_CORS_ALLOWED_ORIGINS",
        default=default_dev_origins,
    )
    dev_csrf_trusted_origins = env.list(
        "DEV_CSRF_TRUSTED_ORIGINS",
        default=default_dev_origins,
    )

    CORS_ALLOWED_ORIGINS = list(
        dict.fromkeys([*CORS_ALLOWED_ORIGINS, *dev_cors_allowed_origins])
    )
    CSRF_TRUSTED_ORIGINS = list(
        dict.fromkeys([*CSRF_TRUSTED_ORIGINS, *dev_csrf_trusted_origins])
    )

if not DEBUG and CORS_ALLOW_CREDENTIALS and not CORS_ALLOWED_ORIGINS:
    raise ImproperlyConfigured(
        "CORS_ALLOWED_ORIGINS must be set when CORS_ALLOW_CREDENTIALS=True and DJANGO_DEBUG=False"
    )

if any(origin.strip() == "*" for origin in CORS_ALLOWED_ORIGINS):
    raise ImproperlyConfigured("Wildcard '*' is not allowed in CORS_ALLOWED_ORIGINS")

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

SESSION_COOKIE_SECURE = env.bool("SESSION_COOKIE_SECURE", default=not DEBUG)
CSRF_COOKIE_SECURE = env.bool("CSRF_COOKIE_SECURE", default=not DEBUG)
SESSION_COOKIE_SAMESITE = env("SESSION_COOKIE_SAMESITE", default="Lax")
CSRF_COOKIE_SAMESITE = env("CSRF_COOKIE_SAMESITE", default="Lax")

email_provider = env("EMAIL_PROVIDER", default="console").strip().lower()
if email_provider not in {"console", "smtp"}:
    raise ImproperlyConfigured("EMAIL_PROVIDER must be one of: console, smtp")

if email_provider == "smtp":
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = env("EMAIL_HOST", default="")
    EMAIL_PORT = env.int("EMAIL_PORT", default=587)
    EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
    EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
    EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
    EMAIL_USE_SSL = env.bool("EMAIL_USE_SSL", default=False)
    EMAIL_TIMEOUT = env.int("EMAIL_TIMEOUT", default=10)

    if EMAIL_USE_TLS and EMAIL_USE_SSL:
        raise ImproperlyConfigured(
            "EMAIL_USE_TLS and EMAIL_USE_SSL cannot both be True when EMAIL_PROVIDER=smtp"
        )

    if not DEBUG and not EMAIL_HOST.strip():
        raise ImproperlyConfigured(
            "EMAIL_HOST must be set when EMAIL_PROVIDER=smtp and DJANGO_DEBUG=False"
        )

    if not DEBUG and not EMAIL_HOST_USER.strip():
        raise ImproperlyConfigured(
            "EMAIL_HOST_USER must be set when EMAIL_PROVIDER=smtp and DJANGO_DEBUG=False"
        )

    if not DEBUG and not EMAIL_HOST_PASSWORD.strip():
        raise ImproperlyConfigured(
            "EMAIL_HOST_PASSWORD must be set when EMAIL_PROVIDER=smtp and DJANGO_DEBUG=False"
        )
else:
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="BoomerBill <noreply@boomerbill.net>")

if not DEBUG and "@" not in DEFAULT_FROM_EMAIL:
    raise ImproperlyConfigured(
        "DEFAULT_FROM_EMAIL must contain a mailbox address when DJANGO_DEBUG=False"
    )
