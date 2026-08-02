# <Rebecca Start>
# Rebecca (M2) — Infrastructure as Code

This Ansible project turns Shawn's blank Ubuntu EC2 instance into a ready
ScamPatrol production server. One command:

1. installs Docker Engine and Docker Compose v2;
2. creates and persists a 1 GiB swap file;
3. creates `/opt/scampatrol` and its persistent data directories;
4. writes the protected production `.env` for the `ubuntu` deployment user;
5. pulls anonymously from the public GitHub Container Registry, with optional
   `read:packages` authentication if the package becomes private;
6. pulls the verified `sha-*` image and starts `docker-compose.prod.yml`; and
7. checks the application's live health endpoint.

Every task is idempotent. Running the same playbook again with the same inputs
finishes with `changed=0`.

## Prerequisites

Run Ansible from Linux, macOS, or Windows Subsystem for Linux. You need:

- Python 3.10 or newer;
- SSH access to the EC2 instance;
- the EC2 private key, stored outside this repository;
- an optional GitHub token with `read:packages` only if GHCR becomes private; and
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

The current EC2 demo uses plain HTTP, so keep:

```yaml
scampatrol_app_base_url: http://YOUR_EC2_IP
scampatrol_cookie_secure: false
```

The GHCR package is public, so keep the registry settings empty:

```yaml
scampatrol_registry_username: ""
scampatrol_registry_token: ""
```

If the package becomes private, fill both values and use a token limited to
`read:packages`. The role skips registry login when the token is empty and
removes stale credentials so an expired token cannot break an anonymous pull.

When HTTPS is added, change the URL to `https://` and the cookie setting to
`true` together. The playbook rejects a mismatch because a Secure login cookie
cannot work over HTTP.

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
bash ./tests/verify-idempotency.sh \
  inventory/production.yml \
  vars/production.yml \
  --ask-vault-pass
```

The script retains `run-1.log`, `run-2.log`, and `summary.txt` under
`ansible/evidence/<UTC timestamp>/`. That directory is gitignored because the
logs contain production operational details. Use the clean second-run recap as
the idempotency evidence in the demonstration or submission.

## Useful checks

```bash
# Local syntax and lint checks
bash ./tests/validate.sh

# Preview supported changes without applying them
ansible-playbook \
  -i inventory/production.yml \
  playbook.yml \
  --extra-vars @vars/production.yml \
  --ask-vault-pass \
  --check --diff

# Inspect the live service
ssh -i /path/to/key.pem ubuntu@SERVER_IP \
  'cd /opt/scampatrol && docker compose -f docker-compose.prod.yml ps'
```

## Expected files on the server

| Path | Purpose | Permission |
|---|---|---|
| `/opt/scampatrol/docker-compose.prod.yml` | Production service definition | `ubuntu:ubuntu`, `0644` |
| `/opt/scampatrol/.env` | Runtime configuration and secrets | `ubuntu:ubuntu`, `0600` |
| `/opt/scampatrol/uploads` | Persistent user uploads | `ubuntu:ubuntu`, `0755` |
| `/opt/scampatrol/data` | Persistent application data | `ubuntu:ubuntu`, `0755` |
| `/swapfile` | 1 GiB swap for the small EC2 instance | `root:root`, `0600` |

## Production hardening that needs external resources

Two improvements must not be enabled with placeholder values:

- **HTTPS:** first provide a DNS name, a TLS certificate, a reverse proxy or load
  balancer, and an AWS security-group rule for port 443. Only then change
  `scampatrol_app_base_url` to `https://...` and
  `scampatrol_cookie_secure` to `true` together. Setting only the cookie flag on
  the current HTTP server breaks login.
- **Managed secret storage:** Ansible Vault is the current encrypted source of
  production variables. Moving to AWS Secrets Manager or Parameter Store also
  requires an agreed secret path, an IAM role with least-privilege access, a
  rotation owner, and a recovery procedure. Do not add fake secret identifiers
  or broad AWS credentials merely to claim the integration exists.

The deployment workflow uses GitHub's protected `production` environment for
the EC2 SSH secret and produces a readiness summary. Real application secrets
remain in Vault until the AWS IAM and secret-store design is supplied.

## Troubleshooting

- **Host key verification failed:** connect once with SSH and verify the
  fingerprint.
- **Permission denied (publickey):** check the key path, key permissions, and
  `ansible_user: ubuntu`.
- **GHCR denied for a public image:** leave the registry token empty and rerun
  Ansible so it removes stale Docker credentials. If the package is private,
  use the correct username and a token limited to `read:packages`.
- **Health check failed:** run
  `sudo docker logs scampatrol --tail 100` on the server. Database configuration
  is the most common cause.
- **Login returns to the guest page:** confirm the server `.env` has
  `COOKIE_SECURE=0` for an `http://` deployment, then recreate the container.
- **Existing swap has a different size:** the playbook stops rather than
  destroying active swap. Disable and remove it manually before changing the
  configured size.
# <Rebecca End>
