#!/usr/bin/env bash
# IP certificates require Certbot >=5.4; Debian 13 ships an older release.
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo 'Run with sudo.' >&2; exit 1; }
[[ $# -eq 1 ]] || { echo 'Use: install-ip-tls.sh PUBLIC_IPV4' >&2; exit 1; }
ip=$(python3 -c 'import ipaddress,sys; print(ipaddress.IPv4Address(sys.argv[1]))' "$1")
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
test -f /etc/nginx/sites-available/fieldnote
install -d -m 0755 /var/www/fieldnote/.well-known/acme-challenge
install -d -m 0700 /etc/letsencrypt /var/lib/letsencrypt
docker pull certbot/certbot:v5.9.0
cat > /usr/local/sbin/fieldnote-certbot <<'WRAPPER'
#!/usr/bin/env bash
set -euo pipefail
exec docker run --rm --name fieldnote-certbot \
  -v /etc/letsencrypt:/etc/letsencrypt \
  -v /var/lib/letsencrypt:/var/lib/letsencrypt \
  -v /var/www/fieldnote:/var/www/fieldnote \
  certbot/certbot:v5.9.0 "$@"
WRAPPER
chmod 0755 /usr/local/sbin/fieldnote-certbot
# Register without an email address. Do not subscribe students to email.
/usr/local/sbin/fieldnote-certbot certonly --non-interactive --agree-tos \
  --register-unsafely-without-email --preferred-profile shortlived \
  --webroot --webroot-path /var/www/fieldnote --ip-address "$ip" --cert-name "$ip"
rendered=$(mktemp)
trap 'rm -f "$rendered"' EXIT
python3 "$SCRIPT_DIR/render-nginx.py" "$ip" --tls > "$rendered"
install -m 0644 "$rendered" /etc/nginx/sites-available/fieldnote
nginx -t
systemctl reload nginx
cat > /etc/systemd/system/fieldnote-certbot.service <<'SERVICE'
[Unit]
Description=Renew Fieldnote IP certificate and reload Nginx
After=docker.service nginx.service
Requires=docker.service

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/fieldnote-certbot renew --quiet
ExecStartPost=/usr/sbin/nginx -t
ExecStartPost=/usr/bin/systemctl reload nginx
SERVICE
cat > /etc/systemd/system/fieldnote-certbot.timer <<'TIMER'
[Unit]
Description=Check Fieldnote certificate renewal twice daily

[Timer]
OnCalendar=*-*-* 00,12:00:00
RandomizedDelaySec=15m
Persistent=true

[Install]
WantedBy=timers.target
TIMER
# The distribution client cannot renew an IP certificate from this lineage.
if systemctl cat certbot.timer >/dev/null 2>&1; then
  systemctl disable --now certbot.timer
fi
systemctl daemon-reload
systemctl enable --now fieldnote-certbot.timer
echo "HTTPS configured for https://$ip. Verify renewal with fieldnote-certbot renew --dry-run."
