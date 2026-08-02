#!/bin/bash
# <Shawn Start>
apt-get update -y

apt-get install -y docker.io docker-compose-v2 curl git

systemctl enable docker
systemctl start docker

usermod -aG docker ubuntu
# <Shawn End>
