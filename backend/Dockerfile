FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY pyproject.toml uv.lock /app/
RUN uv sync --frozen --no-dev

COPY . /app

EXPOSE 8000

CMD ["sh", "-c", "cd /app/core && uv run gunicorn core.wsgi:application --bind 0.0.0.0:${PORT:-8000}"]
