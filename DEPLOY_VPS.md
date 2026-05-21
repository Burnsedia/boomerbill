# BoomerBill - VPS Deployment Guide

Deploy BoomerBill on any Linux VPS (DigitalOcean, Linode, Hetzner, AWS EC2, etc.) using Docker Compose with optional nginx reverse proxy and TLS termination.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Server Setup](#2-server-setup)
3. [Configuration](#3-configuration)
4. [Deploy](#4-deploy)
5. [TLS Termination with Nginx](#5-tls-termination-with-nginx)
6. [Backup Strategy](#6-backup-strategy)
7. [Rolling Restart Procedure](#7-rolling-restart-procedure)
8. [Logging Considerations](#8-logging-considerations)
9. [Troubleshooting](#9-troubleshooting)
10. [Maintenance Checklist](#10-maintenance-checklist)

---

## 1. Prerequisites

### Hardware Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU      | 1 core  | 2 cores     |
| RAM      | 1 GB    | 2 GB        |
| Disk     | 20 GB   | 40 GB SSD   |
| OS       | Ubuntu 22.04/24.04 LTS, Debian 12, or equivalent |

### Software Requirements

- Docker Engine 24+ and Docker Compose v2
- Git (for pulling the repository)
- certbot (for TLS certificates, if using nginx)
- A domain name with DNS pointing to your VPS IP

### Required Environment Variables

Create `backend/.env.vps` from the template below. **Never commit this file.**

```bash
# backend/.env.vps

# --- Core Django ---
DJANGO_SECRET_KEY=<generate-with: python -c "from secrets import token_urlsafe; print(token_urlsafe(50))">
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# --- Security Headers (production) ---
SECURE_SSL_REDIRECT=False          # nginx handles SSL redirect
SECURE_HSTS_SECONDS=0              # nginx handles HSTS
SECURE_HSTS_INCLUDE_SUBDOMAINS=False
SECURE_HSTS_PRELOAD=False
SECURE_CONTENT_TYPE_NOSNIFF=True
SECURE_REFERRER_POLICY=same-origin
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SESSION_COOKIE_SAMESITE=Lax
CSRF_COOKIE_SAMESITE=Lax

# --- Database (set by docker-compose, but can override) ---
# DATABASE_URL is constructed automatically from POSTGRES_* vars
DATABASE_SSL_REQUIRE=False         # internal Docker network, no SSL needed

# --- CORS & CSRF ---
CORS_ALLOWED_ORIGINS=https://yourdomain.com
CORS_ALLOW_CREDENTIALS=False
CSRF_TRUSTED_ORIGINS=https://yourdomain.com

# --- Application ---
PUBLIC_DOMAIN=yourdomain.com
SITE_NAME=BoomerBill
PASSWORD_RESET_CONFIRM_URL=reset-password?uid={uid}&token={token}

# --- Auth ---
AUTH_MODE=dual
ENABLE_JWT_AUTH=True
ENABLE_LEGACY_TOKEN_AUTH=True
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=15
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7
JWT_ROTATE_REFRESH_TOKENS=True
JWT_BLACKLIST_AFTER_ROTATION=True

# --- Email Delivery ---
EMAIL_PROVIDER=smtp
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=<your-sendgrid-api-key>
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
EMAIL_TIMEOUT=10
DEFAULT_FROM_EMAIL=BoomerBill <noreply@yourdomain.com>

# --- App Tuning ---
APP_PORT=8000
APP_WORKERS=2                      # Formula: 2 × CPU cores + 1
```

### Docker Compose Variables (set in shell or `.env` file)

```bash
# .env (project root, next to docker-compose.yml)
POSTGRES_DB=boomerbill
POSTGRES_USER=boomerbill
POSTGRES_PASSWORD=<strong-random-password>
```

---

## 2. Server Setup

### 2.1 Install Docker

```bash
# Update package index
sudo apt update && sudo apt upgrade -y

# Install prerequisites
sudo apt install -y ca-certificates curl gnupg

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine + Compose plugin
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add your user to the docker group (optional, avoids sudo)
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

### 2.2 Install certbot (for TLS)

```bash
sudo apt install -y certbot
```

### 2.3 Configure Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp    # HTTP (for certbot challenge + redirect)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
sudo ufw status
```

### 2.3 Clone the Repository

```bash
cd /opt
sudo git clone https://github.com/<your-org>/boomerbill.git
cd boomerbill
```

---

## 3. Configuration

### 3.1 Create Environment Files

```bash
# 1. Backend environment (NEVER commit this)
cp backend/.env.example backend/.env.vps
nano backend/.env.vps   # Edit with your production values

# 2. Docker Compose environment
cat > .env << 'EOF'
POSTGRES_DB=boomerbill
POSTGRES_USER=boomerbill
POSTGRES_PASSWORD=<generate-a-strong-password>
EOF

chmod 600 .env backend/.env.vps
```

### 3.2 Build the Frontend

The nginx override serves the Astro frontend from `frontend/dist/`. Build it on the VPS or locally before deploying:

```bash
# On the VPS (requires Node.js)
cd frontend
npm ci
npm run build
cd ..

# OR build locally and rsync the dist/ folder
# npm run build
# rsync -avz frontend/dist/ user@vps:/opt/boomerbill/frontend/dist/
```

### 3.3 Configure Nginx Domain

Replace `YOUR_DOMAIN` in the nginx config:

```bash
sed -i 's/YOUR_DOMAIN/yourdomain.com/g' deploy/nginx/conf.d/boomerbill.conf
```

---

## 4. Deploy

### 4.1 Without Nginx (Backend Only)

Use this if you already have a reverse proxy (e.g., Cloudflare Tunnel, Caddy, Traefik):

```bash
docker compose up -d
```

The app will be available on `http://<vps-ip>:8000` (not exposed externally unless you configure it).

### 4.2 With Nginx (Full Stack + TLS)

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d
```

Or set the compose file permanently:

```bash
export COMPOSE_FILE=docker-compose.yml:docker-compose.override.yml
docker compose up -d
```

### 4.3 Verify Deployment

```bash
# Check service status
docker compose ps

# Check logs
docker compose logs -f app

# Test health endpoint
curl -f http://localhost:8000/health/

# If using nginx, test HTTPS
curl -f https://yourdomain.com/health/
```

---

## 5. TLS Termination with Nginx

### 5.1 Obtain Certificates

```bash
# Stop nginx temporarily to free port 80
docker compose stop nginx

# Obtain certificate (standalone mode)
sudo certbot certonly \
  --standalone \
  --preferred-challenges http \
  -d yourdomain.com \
  -d www.yourdomain.com \
  --email admin@yourdomain.com \
  --agree-tos \
  --non-interactive

# Copy certificates to the nginx certs directory
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem deploy/nginx/certs/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem deploy/nginx/certs/
sudo chmod 644 deploy/nginx/certs/fullchain.pem
sudo chmod 600 deploy/nginx/certs/privkey.pem

# Restart nginx
docker compose start nginx
```

### 5.2 Auto-Renewal with Cron

```bash
# Create renewal script
sudo tee /usr/local/bin/renew-boomerbill-cert.sh << 'SCRIPT'
#!/bin/bash
certbot renew --quiet --deploy-hook "
  cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/boomerbill/deploy/nginx/certs/
  cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/boomerbill/deploy/nginx/certs/
  chmod 644 /opt/boomerbill/deploy/nginx/certs/fullchain.pem
  chmod 600 /opt/boomerbill/deploy/nginx/certs/privkey.pem
  docker compose -f /opt/boomerbill/docker-compose.yml -f /opt/boomerbill/docker-compose.override.yml restart nginx
"
SCRIPT

sudo chmod +x /usr/local/bin/renew-boomerbill-cert.sh

# Add to crontab (runs twice daily)
sudo crontab -e
# Add this line:
# 0 0,12 * * * /usr/local/bin/renew-boomerbill-cert.sh >> /var/log/certbot-renew.log 2>&1
```

### 5.3 Alternative: Webroot Renewal (No Downtime)

If you prefer not to stop nginx during renewal, configure certbot to use the webroot method:

```bash
# Initial cert with webroot
sudo certbot certonly \
  --webroot \
  --webroot-path /opt/boomerbill/deploy/nginx/acme \
  -d yourdomain.com \
  -d www.yourdomain.com

# The nginx config already routes /.well-known/acme-challenge/ to this path
```

---

## 6. Backup Strategy

### 6.1 Database Backups

```bash
# Create backup directory
mkdir -p /opt/boomerbill/backups/db

# Manual backup
docker compose exec -T db pg_dump -U boomerbill boomerbill | gzip > /opt/boomerbill/backups/db/backup-$(date +%Y%m%d-%H%M%S).sql.gz

# Automated backup script
sudo tee /usr/local/bin/backup-boomerbill-db.sh << 'SCRIPT'
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/opt/boomerbill/backups/db"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

mkdir -p "$BACKUP_DIR"

# Dump and compress
docker compose -f /opt/boomerbill/docker-compose.yml exec -T db \
  pg_dump -U boomerbill boomerbill | gzip > "$BACKUP_DIR/backup-${TIMESTAMP}.sql.gz"

# Verify backup is not empty
if [ ! -s "$BACKUP_DIR/backup-${TIMESTAMP}.sql.gz" ]; then
  echo "ERROR: Backup is empty!" >&2
  exit 1
fi

# Remove old backups
find "$BACKUP_DIR" -name "backup-*.sql.gz" -mtime +${RETENTION_DAYS} -delete

echo "Backup completed: backup-${TIMESTAMP}.sql.gz"
SCRIPT

sudo chmod +x /usr/local/bin/backup-boomerbill-db.sh

# Schedule daily backups at 2 AM
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-boomerbill-db.sh >> /var/log/boomerbill-backup.log 2>&1
```

### 6.2 Media File Backups

```bash
# Backup media uploads (if any)
sudo tee /usr/local/bin/backup-boomerbill-media.sh << 'SCRIPT'
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/opt/boomerbill/backups/media"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

mkdir -p "$BACKUP_DIR"

# Find the Docker volume mount point and tar it
VOLUME_PATH=$(docker volume inspect boomerbill_media_data --format '{{ .Mountpoint }}' 2>/dev/null || echo "")

if [ -n "$VOLUME_PATH" ] && [ -d "$VOLUME_PATH" ]; then
  tar czf "$BACKUP_DIR/media-${TIMESTAMP}.tar.gz" -C "$VOLUME_PATH" .
  find "$BACKUP_DIR" -name "media-*.tar.gz" -mtime +${RETENTION_DAYS} -delete
  echo "Media backup completed: media-${TIMESTAMP}.tar.gz"
else
  echo "No media volume found, skipping."
fi
SCRIPT

sudo chmod +x /usr/local/bin/backup-boomerbill-media.sh
```

### 6.3 Off-Site Backup

```bash
# Example: Sync backups to remote server via rsync
rsync -avz --delete /opt/boomerbill/backups/ backup-user@backup-server:/backups/boomerbill/

# Or use rclone for cloud storage (S3, Backblaze B2, etc.)
rclone sync /opt/boomerbill/backups remote:boomerbill-backups --log-file /var/log/rclone-backup.log
```

### 6.4 Restore from Backup

```bash
# Restore database
gunzip -c backup-20250101-020000.sql.gz | docker compose exec -T db psql -U boomerbill boomerbill

# Restore media
tar xzf media-20250101-020000.tar.gz -C $(docker volume inspect boomerbill_media_data --format '{{ .Mountpoint }}')
```

---

## 7. Rolling Restart Procedure

### 7.1 Zero-Downtime Update

```bash
cd /opt/boomerbill

# 1. Pull latest code
git pull origin main

# 2. Rebuild frontend (if source changed)
cd frontend && npm ci && npm run build && cd ..

# 3. Pull latest Docker images and rebuild if needed
docker compose pull

# 4. Rebuild app image if Dockerfile or dependencies changed
docker compose build app

# 5. Run database migrations (safe to run even if no new migrations)
docker compose run --rm app uv run python core/manage.py migrate --noinput

# 6. Rolling restart: restart app first, then nginx
docker compose restart app

# Wait for health check to pass
sleep 10
docker compose ps

# 7. Restart nginx to pick up any config changes
docker compose -f docker-compose.yml -f docker-compose.override.yml restart nginx

# 8. Verify
curl -f https://yourdomain.com/health/
docker compose logs --tail=20 app
```

### 7.2 Blue-Green Style (Manual)

For critical updates where you want to verify before switching traffic:

```bash
# 1. Bring up a parallel stack on a different port
APP_PORT=8001 docker compose -f docker-compose.yml up -d app

# 2. Test the new instance
curl -f http://localhost:8001/health/

# 3. If healthy, update nginx to point to the new port
#    (edit deploy/nginx/conf.d/boomerbill.conf, change upstream port)
#    Or use the docker-compose internal DNS which auto-resolves

# 4. Restart nginx
docker compose -f docker-compose.yml -f docker-compose.override.yml restart nginx

# 5. Tear down the old stack
docker compose -f docker-compose.yml down app
```

### 7.3 Rollback Procedure

```bash
# If something goes wrong after deployment:

# 1. Check logs for errors
docker compose logs --tail=100 app

# 2. Rollback to previous Docker image
docker compose down app
docker tag boomerbill-app:latest boomerbill-app:broken   # Save broken image for debugging
docker tag boomerbill-app:previous boomerbill-app:latest # If you tagged previous
docker compose up -d app

# 3. Or rollback database migration (if needed)
docker compose run --rm app uv run python core/manage.py migrate core <previous_migration>

# 4. Verify rollback
curl -f https://yourdomain.com/health/
```

---

## 8. Logging Considerations

### 8.1 Docker Logging Configuration

By default, Docker uses the `json-file` logging driver. Configure log rotation to prevent disk exhaustion:

```bash
# Create /etc/docker/daemon.json
sudo tee /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

# Restart Docker to apply
sudo systemctl restart docker
```

### 8.2 Application Logs

The Django app logs to stdout/stderr (captured by Docker). Configure log levels in `.env.vps`:

```bash
# Add to backend/.env.vps
DJANGO_LOG_LEVEL=INFO
GUNICORN_ACCESS_LOG=true
```

View logs:

```bash
# Follow app logs
docker compose logs -f app

# Follow nginx logs
docker compose -f docker-compose.yml -f docker-compose.override.yml logs -f nginx

# Follow database logs
docker compose logs -f db

# Last 100 lines
docker compose logs --tail=100 app
```

### 8.3 Nginx Access Logs

Nginx logs are stored in a Docker volume. Access them:

```bash
# View nginx access log
docker compose exec nginx tail -f /var/log/nginx/boomerbill-access.log

# View nginx error log
docker compose exec nginx tail -f /var/log/nginx/boomerbill-error.log

# Copy logs to host for analysis
docker compose cp nginx:/var/log/nginx/ ./nginx-logs/
```

### 8.4 Structured Logging (Optional)

For production-grade log aggregation, consider adding structured logging:

```python
# Add to backend/core/settings.py (or via environment)
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            '()': 'pythonjsonlogger.jsonlogger.JsonFormatter',
            'format': '%(asctime)s %(levelname)s %(name)s %(message)s',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}
```

Install the JSON logger:
```bash
# Add to backend/pyproject.toml dependencies
python-json-logger = ">=2.0"
```

### 8.5 Log Aggregation Options

| Tool | Use Case | Setup Complexity |
|------|----------|-----------------|
| **Loki + Promtail** | Lightweight, Grafana-native | Medium |
| **ELK Stack** | Full-featured, resource-heavy | High |
| **Papertrail** | Managed, easy setup | Low |
| **Datadog** | Managed, comprehensive | Low |

For a single VPS, the built-in Docker logging with log rotation is usually sufficient. Add external aggregation when you have multiple servers or need advanced search/alerting.

---

## 9. Troubleshooting

### Common Issues

**App won't start:**
```bash
docker compose logs app
# Check for missing env vars, database connection issues, or migration errors
```

**Database connection refused:**
```bash
# Verify db container is healthy
docker compose ps db
docker compose logs db
# Check POSTGRES_PASSWORD matches in both .env and .env.vps
```

**Nginx 502 Bad Gateway:**
```bash
# App is not running or not healthy
docker compose ps app
docker compose logs app
# Verify app is listening on port 8000
docker compose exec app curl -f http://localhost:8000/health/
```

**TLS certificate errors:**
```bash
# Check certificate files exist and are readable
ls -la deploy/nginx/certs/
# Verify certificate matches domain
openssl x509 -in deploy/nginx/certs/fullchain.pem -noout -subject -dates
```

**Disk space issues:**
```bash
# Check Docker disk usage
docker system df
# Clean up unused images and volumes
docker system prune -a --volumes
# Check log sizes
du -sh /var/lib/docker/containers/*/*-json.log
```

---

## 10. Maintenance Checklist

### Weekly
- [ ] Review error logs: `docker compose logs --tail=500 app | grep ERROR`
- [ ] Check disk space: `df -h`
- [ ] Verify backups exist and are non-empty

### Monthly
- [ ] Update OS packages: `sudo apt update && sudo apt upgrade -y`
- [ ] Update Docker images: `docker compose pull && docker compose up -d`
- [ ] Test backup restoration on a staging environment
- [ ] Review nginx access logs for suspicious patterns

### Quarterly
- [ ] Rotate Django secret key (requires brief downtime)
- [ ] Rotate database password
- [ ] Review and update TLS certificate automation
- [ ] Performance review: check response times, database query performance

---

## Quick Reference

```bash
# Start services
docker compose up -d

# Start with nginx
docker compose -f docker-compose.yml -f docker-compose.override.yml up -d

# View logs
docker compose logs -f app

# Run management commands
docker compose run --rm app uv run python core/manage.py createsuperuser
docker compose run --rm app uv run python core/manage.py shell

# Backup database
docker compose exec -T db pg_dump -U boomerbill boomerbill | gzip > backup.sql.gz

# Restore database
gunzip -c backup.sql.gz | docker compose exec -T db psql -U boomerbill boomerbill

# Update deployment
git pull && docker compose pull && docker compose build app && docker compose up -d

# Stop everything
docker compose down
```
