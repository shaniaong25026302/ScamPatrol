# Rebecca (M2) — Infrastructure as Code

This Ansible project turns Shawn's blank Ubuntu EC2 instance into a ready
ScamPatrol production server. One command:

1. installs Docker Engine and Docker Compose v2;
2. creates and persists a 1 GiB swap file;
3. creates `/opt/scampatrol` and its persistent data directories;
4. writes the protected production `.env`;
5. logs in to the private GitHub Container Registry;
6. pulls the verified `sha-*` image and starts `docker-compose.prod.yml`; and
7. checks the application's live health endpoint.

Every task is idempotent. Running the same playbook again with the same inputs
finishes with `changed=0`.

## Prerequisites

Run Ansible from Linux, macOS, or Windows Subsystem for Linux. You need:

- Python 3.10 or newer;
- SSH access to the EC2 instance;
- the EC2 private key, stored outside this repository;
- a GitHub token with `read:packages` only; and
- the verified `sha-*` image tag printed by the CD workflow.

Never commit the EC2 key, GitHub token, database password, API key, `.env`, or
Vault password.

## 1. Install Ansible

```bash
cd ansible
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements-dev.txt
ansible-galaxy collection install -r requirements.yml
```

## 2. Create the inventory

```bash
cp inventory/production.example.yml inventory/production.yml
```

Edit `inventory/production.yml`:

```yaml
ansible_host: 203.0.113.10
ansible_user: ubuntu
ansible_ssh_private_key_file: /home/rebecca/.ssh/ScamPatrol.pem
```

Connect once with normal SSH and verify the displayed host-key fingerprint. This
adds the trusted server key to `known_hosts`; host-key checking remains enabled.

```bash
ssh -i /home/rebecca/.ssh/ScamPatrol.pem ubuntu@203.0.113.10
```

## 3. Create encrypted production variables

```bash
cp vars/production.example.yml vars/production.yml
```

Replace every `REPLACE_WITH_...` value. Use the immutable image name shown by
Shania's CD workflow, for example:

```yaml
scampatrol_image: ghcr.io/shaniaong25026302/scampatrol:sha-a1b2c3d
```

Encrypt the completed file before keeping it:

```bash
ansible-vault encrypt vars/production.yml
```

The file is gitignored even after encryption. Do not commit it.

## 4. Test connectivity and deploy

```bash
ansible -i inventory/production.yml production -m ping

ansible-playbook \
  -i inventory/production.yml \
  playbook.yml \
  --extra-vars @vars/production.yml \
  --ask-vault-pass
```

Open the EC2 public IP in a browser after the health check passes.

## 5. Prove idempotency

The test runs the exact playbook twice. The second run must report
`changed=0`, `unreachable=0`, and `failed=0`.

```bash
./tests/verify-idempotency.sh \
  inventory/production.yml \
  vars/production.yml \
  --ask-vault-pass
```

## Useful checks

```bash
# Local syntax and lint checks
./tests/validate.sh

# Preview supported changes without applying them
ansible-playbook \
  -i inventory/production.yml \
  playbook.yml \
  --extra-vars @vars/production.yml \
  --ask-vault-pass \
  --check --diff

# Inspect the live service
ssh -i /path/to/key.pem ubuntu@SERVER_IP \
  'cd /opt/scampatrol && sudo docker compose -f docker-compose.prod.yml ps'
```

## Expected files on the server

| Path | Purpose | Permission |
|---|---|---|
| `/opt/scampatrol/docker-compose.prod.yml` | Production service definition | `0644` |
| `/opt/scampatrol/.env` | Runtime configuration and secrets | `0600` |
| `/opt/scampatrol/uploads` | Persistent user uploads | `0755` |
| `/opt/scampatrol/data` | Persistent application data | `0755` |
| `/swapfile` | 1 GiB swap for the small EC2 instance | `0600` |

## Troubleshooting

- **Host key verification failed:** connect once with SSH and verify the
  fingerprint.
- **Permission denied (publickey):** check the key path, key permissions, and
  `ansible_user: ubuntu`.
- **GHCR denied:** use the correct GitHub username and a token with
  `read:packages`.
- **Health check failed:** run
  `sudo docker logs scampatrol --tail 100` on the server. Database configuration
  is the most common cause.
- **Existing swap has a different size:** the playbook stops rather than
  destroying active swap. Disable and remove it manually before changing the
  configured size.

