# M2 Rebecca — Infrastructure as Code Contribution

## Contribution

I created the Ansible automation that prepares a blank Ubuntu EC2 server for
ScamPatrol. The playbook installs Docker and Docker Compose, creates a persistent
swap file, prepares the `/opt/scampatrol` folders, generates the protected
runtime environment file, authenticates to GHCR, starts the verified production
image, and checks that the application is live.

## Why Ansible was used

Ansible describes the required server state in YAML and applies it through SSH.
This removes the need to repeat manual commands, reduces setup mistakes, and
makes the server configuration reproducible. The same playbook can prepare a
replacement server or restore the expected configuration after accidental
changes.

## Idempotency

The automation is idempotent: each module first compares the current state with
the desired state. Packages are installed only when missing, Docker is started
only when stopped, directories and files are updated only when different, and
the Compose module recreates the application only when its configuration or
image changes. The included test runs the playbook twice and requires the second
run to finish with `changed=0`.

## Security controls

- Secrets are stored in an ignored Ansible Vault file, not in Git.
- The generated `/opt/scampatrol/.env` is readable only by the dedicated
  `ubuntu` deployment user (`0600`). This lets Shawn's SSH deployment use it
  without `sudo` while keeping it private from other users.
- SSH host-key checking remains enabled.
- The registry token needs only `read:packages`.
- Deployment rejects `latest` and accepts only a verified `sha-*` tag or image
  digest.
- Sensitive Ansible tasks use `no_log: true`.

## How it connects to the team

Shania's CD workflow publishes and verifies an immutable image. Shawn's Terraform
creates only the Ubuntu EC2 infrastructure. My Ansible playbook then configures
that host and establishes `/opt/scampatrol` as the handoff. Shawn's Deploy
workflow consumes that same Ansible-managed directory and Compose file for later
image updates and rollback. No separate manual server setup is required.

## Demonstration

1. Show the fresh EC2 instance and Ansible inventory.
2. Run the playbook and show Docker, swap, directories, and deployment tasks.
3. Open ScamPatrol in the browser and show the live container.
4. Run the idempotency test.
5. Highlight the second recap: `changed=0`, `unreachable=0`, `failed=0`.

## Validation

- All Ansible and workflow YAML files parse successfully.
- Both Ansible helper scripts pass shell syntax checking.
- The Ansible template and `.env.example` contain the same application settings.
- Application tests: 38 passed, 31 skipped because no test database was supplied,
  and 0 failed.
- Application lint: 0 errors and 5 pre-existing warnings outside the IaC files.
- New cookie tests prove both the current HTTP setting and the future HTTPS setting.

Run `./tests/validate.sh` from the Ansible virtual environment before opening the
pull request. The live two-run idempotency test additionally requires the real EC2
address, SSH key, image tag and encrypted production variables. The included
`tests/verify-idempotency.sh` performs that final server-side check without storing
those values in the repository.
