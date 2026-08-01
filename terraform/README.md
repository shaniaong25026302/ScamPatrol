# Terraform and Ansible responsibility boundary

Shawn's Terraform owns the AWS infrastructure: the EC2 instance, network placement,
security group, public address, and SSH key association. It deliberately does not
install Docker or configure ScamPatrol through `user_data`.

Rebecca's Ansible playbook owns the operating-system and application configuration:
Docker, swap, `/opt/scampatrol`, the protected `.env`, registry authentication,
Compose, and the initial health-checked application start.

This avoids two tools configuring the same server in different ways.

## First deployment

1. Shawn runs `terraform apply` and gives Rebecca the `public_ip` output.
2. Rebecca places that address in `ansible/inventory/production.yml`.
3. Rebecca runs `ansible/playbook.yml` until it completes successfully.
4. Shawn uses the Deploy workflow for later verified `sha-*` image releases.

Do not manually install Docker or create a second application directory on the EC2
host. If the server configuration changes, update and rerun Ansible.
