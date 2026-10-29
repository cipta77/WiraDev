#!/bin/bash
set -e

# ============================================================
# WiraDev Standalone Production Deployment Script
# Adapted from wirakarsa-deployment-org
# Usage: ./deploy.sh [DOMAIN]
# Example: ./deploy.sh wirakarsa.infinitelearningstudent.id
# Default domain: localhost
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BE_DIR="$ROOT_DIR/wiradev-be"
FE_DIR="$ROOT_DIR/wiradev-fe"
DOMAIN="${1:-localhost}"

echo "=== STARTING WIRADEV DEPLOYMENT ==="
echo "Domain  : $DOMAIN"
echo "BE dir  : $BE_DIR"
echo "FE dir  : $FE_DIR"
echo ""

# ── 1. SETUP NPM GLOBAL & TOOLS ─────────────────────────────
echo "Step 1: Setting up npm global & tools..."
mkdir -p ~/.npm-global
npm config set prefix ~/.npm-global

if ! grep -q "npm-global/bin" ~/.bashrc 2>/dev/null; then
  echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
fi
export PATH=~/.npm-global/bin:$PATH

npm install -g pnpm pm2
echo "[NPM] pnpm and pm2 ready."

# ── 2. SETUP DATABASE ────────────────────────────────────────
echo ""
echo "Step 2: Configuring MySQL Database..."

if [ -f "$BE_DIR/.env" ]; then
  DB_USER=$(grep  "^DB_USER="     "$BE_DIR/.env" | cut -d= -f2)
  DB_PASS=$(grep  "^DB_PASSWORD=" "$BE_DIR/.env" | cut -d= -f2 | tr -d '"')
  DB_NAME=$(grep  "^DB_NAME="     "$BE_DIR/.env" | cut -d= -f2)
  DB_HOST=$(grep  "^DB_HOST="     "$BE_DIR/.env" | cut -d= -f2)
else
  DB_USER="root"
  DB_PASS=""
  DB_NAME="wirakarsa"
  DB_HOST="localhost"
fi

echo "[MySQL] Using DB_USER=$DB_USER DB_NAME=$DB_NAME DB_HOST=$DB_HOST"

mysql -h "$DB_HOST" -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"} \
  -e "CREATE DATABASE IF NOT EXISTS $DB_NAME;" 2>/dev/null || true
mysql -h "$DB_HOST" -u "$DB_USER" ${DB_PASS:+-p"$DB_PASS"} "$DB_NAME" \
  < "$BE_DIR/db/init.sql" 2>/dev/null || true
echo "[MySQL] Database ready."

# ── 3. BACKEND ───────────────────────────────────────────────
echo ""
echo "Step 3: Setting up backend..."
cd "$BE_DIR"

BE_PORT=5000
if ss -tlnp 2>/dev/null | grep -q ":5000 " || lsof -i :5000 > /dev/null 2>&1; then
  BE_PORT=5100
  echo "[Backend] Port 5000 in use, using port $BE_PORT instead."
fi

if [ -f "$BE_DIR/.env" ]; then
  sed -i "s/^PORT=.*/PORT=$BE_PORT/" "$BE_DIR/.env"
fi
echo "[Backend] PORT=$BE_PORT"

pnpm install
pnpm build
mkdir -p uploads

pm2 delete wiradev-backend 2>/dev/null || true
pm2 start dist/src/main.js --name wiradev-backend
pm2 save
echo "[PM2] Backend started."

# Reboot fallback
(crontab -l 2>/dev/null | grep -v "pm2 resurrect"; \
 echo "@reboot $(which pm2) resurrect") | crontab -

# ── 4. FRONTEND ──────────────────────────────────────────────
echo ""
echo "Step 4: Setting up frontend..."
cd "$FE_DIR"

if [ -f ".env.local" ]; then
  sed -i "s|^NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=http://$DOMAIN|" .env.local
else
  echo "NEXT_PUBLIC_API_URL=http://$DOMAIN" > .env.local
fi
echo "[Frontend] NEXT_PUBLIC_API_URL=http://$DOMAIN"

pnpm install
PORT=3000 pnpm build

pm2 delete wiradev-frontend 2>/dev/null || true
PORT=3001 pm2 start node_modules/next/dist/bin/next \
  --name wiradev-frontend -- start -p 3001
pm2 save
echo "[PM2] Frontend started."

# ── 5. NGINX ─────────────────────────────────────────────────
echo ""
echo "Step 5: Configuring Nginx..."

cat > /tmp/nginx-wiradev.conf << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /api {
        proxy_pass http://127.0.0.1:$BE_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /health {
        proxy_pass http://127.0.0.1:$BE_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    location /docs {
        proxy_pass http://127.0.0.1:$BE_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }

    location /api-docs.yml {
        proxy_pass http://127.0.0.1:$BE_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }

    location /uploads {
        proxy_pass http://127.0.0.1:$BE_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
    }
}
EOF

if command -v nginx > /dev/null 2>&1; then
  sudo mv /tmp/nginx-wiradev.conf /etc/nginx/sites-available/default
  sudo nginx -t
  sudo systemctl reload nginx
  echo "[Nginx] Configured and reloaded."
else
  echo "[Nginx] Nginx not installed or running locally. Saved config to deploy/nginx.conf."
fi

echo ""
echo "=== DEPLOYMENT COMPLETED ==="
echo "Frontend : http://$DOMAIN"
echo "Backend  : http://$DOMAIN/api"
echo "Health   : http://$DOMAIN/health"
echo "Docs     : http://$DOMAIN/docs"
