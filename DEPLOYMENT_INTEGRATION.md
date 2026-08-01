# ScamPatrol deployment integration

This is the single agreed production flow. It replaces the previous situation where
Terraform/manual commands, two Ansible roles, and the Deploy workflow each configured
different parts of the same EC2 host.

## Ownership

| Owner             | Responsibility                                        | Output / handoff           |
| ----------------- | ----------------------------------------------------- | -------------------------- |
| Shania — CI/CD    | Test code and publish a verified immutable image      | `ghcr.io/...:sha-*`        |
| Shawn — Terraform | Create EC2, networking, security group and SSH access | EC2 public IP              |
| Rebecca — Ansible | Configure Ubuntu, Docker, swap, secrets and Compose   | `/opt/scampatrol`          |
| Shawn — Deploy    | Release or roll back a verified image                 | Healthy public application |

## First deployment

1. Shawn runs Terraform and provides the EC2 public IP.
2. Rebecca enters that IP in `ansible/inventory/production.yml` and uses the verified
   CD image in her encrypted `vars/production.yml`.
3. Rebecca runs `ansible/playbook.yml`. It creates `/opt/scampatrol`, writes `.env`,
   installs Compose, logs the deployment user in to GHCR, starts the image, and requires
   the database readiness endpoint to return HTTP 200.
4. Shawn's Deploy workflow verifies that exact Ansible handoff and then performs future
   image-only releases through the same Compose project.

## Login configuration

The current EC2 demo is reached through `http://`, so its Ansible variables must contain:

```yaml
scampatrol_app_base_url: http://EC2_PUBLIC_IP
scampatrol_cookie_secure: false
```

That renders `COOKIE_SECURE=0` in `/opt/scampatrol/.env`. When HTTPS is installed, change
both values together. The Ansible preflight check prevents an invalid combination.

The application image must also contain the updated `src/utils/jwt.js` that reads
`COOKIE_SECURE`. Therefore, merge this integration change first, wait for CD to publish
its new `sha-*` image, place that complete image name in the encrypted Ansible variables,
and then rerun the playbook. Adding the environment value to an older image is not enough.

## Server rules

- Do not manually create another app directory such as `~/scampatrol` or `~/scamlah`.
- Do not install Docker in Terraform `user_data`; Ansible owns package configuration.
- Do not use the removed `site.yml` or `server_setup` role; `playbook.yml` and the
  `scampatrol` role are the only supported Ansible entry point.
- Do not deploy `latest`; use the verified `sha-*` tag printed by CD.
- Never commit `.env`, Vault variables, SSH keys, tokens or Terraform state.

## Verification

After provisioning:

```bash
ansible -i inventory/production.yml production -b -m shell \
  -a 'stat -c "%U:%G %a %n" /opt/scampatrol /opt/scampatrol/.env /opt/scampatrol/docker-compose.prod.yml'
```

Expected ownership is `ubuntu:ubuntu`; `.env` remains private at mode `600`.

Then verify readiness and the login-cookie setting without displaying secrets:

```bash
curl -fsS http://EC2_PUBLIC_IP/api/health

ssh -i /path/to/key.pem ubuntu@EC2_PUBLIC_IP \
  'grep "^COOKIE_SECURE=0$" /opt/scampatrol/.env >/dev/null && echo "HTTP cookie configuration OK"'
```
