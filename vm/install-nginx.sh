#!/usr/bin/env bash
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo 'Run this installer with sudo.' >&2; exit 1; }
[[ $# -eq 1 ]] || { echo 'Use: install-nginx.sh YOUR_HOST' >&2; exit 1; }
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
test -f "$SCRIPT_DIR/../frontend/dist/index.html"
rendered=$(mktemp /tmp/ac215-nginx-XXXXXXXX)
trap 'rm -f "$rendered"' EXIT
python3 "$SCRIPT_DIR/render-nginx.py" "$1" > "$rendered"
apt-get update
apt-get install -y nginx
install -d -m 0755 /var/www/ac215/assets
# Copy the complete public build, including fonts, portraits and scene fallback.
# Retain prior hashed assets for tabs using an earlier release.
for path in "$SCRIPT_DIR/../frontend/dist/"*; do
  [[ $(basename "$path") == index.html ]] && continue
  cp -R "$path" /var/www/ac215/
done
install -m 0644 "$SCRIPT_DIR/../frontend/dist/index.html" /var/www/ac215/index.html
chmod -R a+rX /var/www/ac215
install -m 0644 "$SCRIPT_DIR/nginx-security.conf" /etc/nginx/snippets/ac215-security.conf
if [[ ! -f /etc/nginx/sites-available/ac215 ]]; then
  install -m 0644 "$rendered" /etc/nginx/sites-available/ac215
fi
ln -sfn /etc/nginx/sites-available/ac215 /etc/nginx/sites-enabled/ac215
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable --now nginx
systemctl reload nginx
echo 'Nginx configuration and frontend files are installed. Follow the guide to verify HTTP delivery.'
