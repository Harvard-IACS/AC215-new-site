#!/usr/bin/env bash
set -euo pipefail
exec > >(tee -a /var/log/gce-web-bootstrap.log) 2>&1
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get upgrade -y
apt-get install -y ca-certificates curl python3 unattended-upgrades
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'SETTINGS'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
SETTINGS
install -d -m 0755 /etc/ssh/sshd_config.d
cat > /etc/ssh/sshd_config.d/00-gce-web.conf <<'SSH'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
UsePAM yes
SSH
/usr/sbin/sshd -t
systemctl reload ssh
# Install Docker Engine from its official Debian repository.
install -m 0755 -d /etc/apt/keyrings
curl --fail --silent --show-error --retry 3 https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
cat > /etc/apt/sources.list.d/docker.sources <<DOCKER
Types: deb
URIs: https://download.docker.com/linux/debian
Suites: $(. /etc/os-release && echo "$VERSION_CODENAME")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
DOCKER
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin
systemctl enable --now docker
install -d -m 0755 /opt/gce-web/releases
touch /var/lib/gce-web-bootstrap.ready
echo 'Bootstrap complete. Deploy the app next.'
