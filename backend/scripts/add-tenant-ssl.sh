#!/bin/bash
# add-tenant-ssl.sh
# Provisions a Let's Encrypt SSL cert for a custom tenant domain
# and registers it in the single tenants-catchall.conf map.
#
# Usage: bash add-tenant-ssl.sh <domain> <email>
# Example: bash add-tenant-ssl.sh app.rchem.lk admin@circleone.asia

set -e

DOMAIN="$1"
EMAIL="${2:-admin@circleone.asia}"
CONF="/etc/nginx/sites-available/tenants-catchall.conf"
if [ ! -f "$CONF" ] && [ -f "/etc/nginx/conf.d/tenants-catchall.conf" ]; then
  CONF="/etc/nginx/conf.d/tenants-catchall.conf"
fi
WEBROOT="/var/www/letsencrypt"
CERT="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
KEY="/etc/letsencrypt/live/$DOMAIN/privkey.pem"

if [ -z "$DOMAIN" ]; then
  echo "ERROR: Domain argument is required." >&2
  exit 1
fi

echo "Provisioning SSL for: $DOMAIN"

mkdir -p "$WEBROOT"

certbot certonly \
  --webroot \
  --webroot-path "$WEBROOT" \
  --domain "$DOMAIN" \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  --keep-until-expiring

if [ $? -ne 0 ]; then
  echo "certbot failed for $DOMAIN" >&2
  exit 1
fi

echo "Certificate issued: $CERT"

if grep -qF "$DOMAIN" "$CONF"; then
  echo "$DOMAIN already in nginx map -- skipping."
else
  sed -i "/# TENANT_CERTS_END/i\\    $DOMAIN $CERT;" "$CONF"
  sed -i "/# TENANT_KEYS_END/i\\    $DOMAIN $KEY;" "$CONF"
  echo "Added $DOMAIN to nginx SSL map."
fi

nginx -t && nginx -s reload

echo "Done: $DOMAIN is now live with HTTPS!"