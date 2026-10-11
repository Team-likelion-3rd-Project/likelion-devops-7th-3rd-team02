#!/bin/bash
set -euxo pipefail

# ------------------------------------------------------------
# Package Update
# ------------------------------------------------------------
apt-get update -y
apt-get install -y curl unzip snapd

# ------------------------------------------------------------
# SSM Agent
# ------------------------------------------------------------
# SSM Agent - ensure installed and running
if systemctl list-unit-files | grep -q '^amazon-ssm-agent.service'; then
    # deb 방식으로 이미 설치된 경우
    systemctl enable --now amazon-ssm-agent
elif snap list amazon-ssm-agent >/dev/null 2>&1; then
    # Ubuntu AWS AMI에서 흔한 snap 방식
    systemctl enable --now snap.amazon-ssm-agent.amazon-ssm-agent.service
else
    # 설치되어 있지 않은 경우
    snap install amazon-ssm-agent --classic
    systemctl enable --now snap.amazon-ssm-agent.amazon-ssm-agent.service
fi

# ------------------------------------------------------------
# AWS CLI v2
# ------------------------------------------------------------
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" \
  -o "/tmp/awscliv2.zip"

cd /tmp
unzip -q awscliv2.zip
./aws/install

# ------------------------------------------------------------
# kubectl
# ------------------------------------------------------------
curl -LO "https://dl.k8s.io/release/v1.36.2/bin/linux/amd64/kubectl"

install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

rm -rf /tmp/aws /tmp/awscliv2.zip /tmp/kubectl

# ------------------------------------------------------------
# Docker
# ------------------------------------------------------------
apt-get install -y docker.io

# Docker Enable & Start
systemctl enable --now docker

# Allow ubuntu user to use Docker
usermod -aG docker ubuntu

# GitLab directories
mkdir -p /srv/gitlab/config
mkdir -p /srv/gitlab/logs
mkdir -p /srv/gitlab/data

# GitLab CE with Container Registry on port 5050
docker run -d \
  --hostname "${gitlab_hostname}" \
  --name gitlab \
  --restart always \
  -p 80:80 \
  -p 2222:22 \
  -p 5050:5050 \
  -v /srv/gitlab/config:/etc/gitlab \
  -v /srv/gitlab/logs:/var/log/gitlab \
  -v /srv/gitlab/data:/var/opt/gitlab \
  -e "GITLAB_OMNIBUS_CONFIG=external_url 'https://${gitlab_hostname}'; gitlab_rails['nginx']['listen_port'] = 80; gitlab_rails['nginx']['listen_https'] = false; registry_external_url 'https://${gitlab_hostname}:5050'; registry['nginx']['listen_port'] = 5050; registry['nginx']['listen_https'] = false; gitlab_rails['gitlab_shell_ssh_port'] = 2222;" \
  gitlab/gitlab-ce:latest

# GitLab Runner directory
mkdir -p /srv/gitlab-runner/config

# GitLab Runner
docker run -d \
  --name gitlab-runner \
  --restart always \
  -v /srv/gitlab-runner/config:/etc/gitlab-runner \
  -v /var/run/docker.sock:/var/run/docker.sock \
  gitlab/gitlab-runner:latest