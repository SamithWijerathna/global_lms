#!/bin/bash
# ============================================================
# add-tenant-ssl.sh
# Provisions a Let'S Encrypt SSL cert for a custom tenant domain
# and registers it in the single tenants-catchall.conf map.
#
# Usage: bash add-tenant-ssl.sh <domain> <email>
# Example: bash add-tenant-ssl.sh app.rchem.lk admin@circleone.asia
# ============================================================

set -e

DOMAIN="$1"
EMAIL="${2:-admin@circleone.asia}"
CONF="/etc/nginx/sites-available/tenants-catchall.conf"
WEBROOT="/var/www/letsencrypt"
CERT="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
KEY="/etc/letsencrypt/live/$DOMAIN/privkey.pem"

if [ -z "$DOMAIN" ]; then
  echo "ERROR: Domain argument is required." >&2
  exit 1
fi

echo "🔐 Provisioning SSL for: $DOMAIN"

# 1. Ensure webroot directory exists (for ACME HTTP-01 challenge)
mkdir -p "$WEBROOT"

# 2. Issue certificate using certbot webroot plugin
#    (nginx must already be running & serving /.well-known/ from $WEBROOT)
certbot certonly \
  --webroot \
  --webroot-path "$WEBROOT" \
  --domain "$DOMAIN" \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  --keep-until-expiring

if [ $? -ne 0 ]; then
  echo "❌ certbot failed for $DOMAIN" >&2
  exit 1
fi

echo "✅ Certificate issued: $CERT"

# 3. Add domain to nginx map (only if not already present)
if grep -qF "$DOMAIN" "$CONF"; then
  echo "ℹ️  $DOMAIN already in nginx map — skipping duplicate entry."
else
  # Insert cert entry before TENANT_CERTS_END marker
  sed -i "/# TENANT_CERTS_END/i\\    $DOMAIN $CERT;" "$CONF"
  # Insert key entry before TENANT_KEYS_END marker
  sed -i "/# TENANT_KEYS_END/i\\    $DOMAIN $KEY;" "$CONF"
  echo "✅ Added $DOMAIN to nginx SSL map."
fi

# 4. Test nginx config and reload
nginx -t && nginx -s reload

echo "🚀 nginx reloaded — $DOMAIN is now live with HTTPS!"
