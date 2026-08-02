# Rebecca's Ansible integration changes

## Improvements completed

- Removed `terraform/user_data.sh` and the EC2 `user_data` reference. Terraform now creates infrastructure only; Ansible owns Docker and server configuration.
- Standardised GHCR for the project's public package. Anonymous pulls are the default, while a username and read-only token remain optional if the package later becomes private.
- Added a preflight check that rejects incomplete registry credentials. The username and token must either both be empty or both be supplied.
- Updated deployment to use immutable `sha-...` image tags instead of `latest`.
- Made deployment verify the Ansible hand-off at `/opt/scampatrol` before changing the running application.
- Added a blocking Ansible validation job to CI.
- Made the idempotency test retain timestamped first-run, second-run, and summary evidence.
- Updated the Ansible, Terraform, deployment, and project documentation to describe the same ownership model.

## Deliberately not faked in this submission

- **HTTPS and `COOKIE_SECURE=1`:** these require a domain name, DNS record, TLS certificate, HTTPS listener or reverse proxy, and port 443 access. Setting `COOKIE_SECURE=1` while the site still uses HTTP would stop the browser from returning the login cookie and would break login.
- **AWS Secrets Manager or Parameter Store:** this requires an EC2 IAM role, agreed secret names/paths, access policies, and a rotation owner. Until the team supplies those resources, production secrets remain in an Ansible Vault-encrypted variables file and must never be committed in plaintext.

## Required GitHub production configuration

- Secret: `EC2_SSH_KEY`
- Variable or secret: `EC2_HOST`
- Variable or secret: `EC2_USER` (defaults to `ubuntu` when omitted)
- Optional variable: `APP_BASE_URL`
- Variable: `AUTO_DEPLOY=true` only when automatic production deployment is approved

The public GHCR configuration does not require `GHCR_USERNAME` or `GHCR_TOKEN`.

## Evidence to collect before the final demonstration

1. Let CI run `ansible/tests/validate.sh` on the pull request.
2. Run the playbook against the intended EC2 instance with the encrypted production variables.
3. Run `bash ansible/tests/verify-idempotency.sh` and keep the generated `ansible/evidence/<timestamp>/summary.txt` screenshot or artifact.
4. Confirm `https://<host>/api/health` only after HTTPS infrastructure exists; until then use the configured HTTP health URL.
5. Demonstrate that the application was deployed with a verified `sha-...` image tag.
