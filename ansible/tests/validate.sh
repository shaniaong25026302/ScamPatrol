#!/usr/bin/env bash
# <Rebecca Start>
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ansible_dir="$(cd -- "${script_dir}/.." && pwd)"
cd "${ansible_dir}"

for obsolete in \
  site.yml \
  roles/server_setup \
  templates/env.j2 \
  inventory/hosts.ini \
  inventory/local.ini; do
  if [ -e "${obsolete}" ]; then
    echo "Obsolete duplicate Ansible implementation found: ${obsolete}"
    exit 1
  fi
done

if [ -e ../terraform/user_data.sh ] \
  || grep -Eq '^[[:space:]]*user_data[[:space:]]*=' ../terraform/ec2.tf; then
  echo "Terraform still bootstraps the host. Docker and OS configuration belong to Ansible."
  exit 1
fi

if grep -Eq 'name: scampatrol_registry_(username|token)' playbook.yml; then
  echo "Public GHCR credentials must not be mandatory in the Ansible preflight checks."
  exit 1
fi

documented="$(mktemp)"
rendered="$(mktemp)"
trap 'rm -f "${documented}" "${rendered}"' EXIT

grep -oE '^[A-Z0-9_]+=' ../.env.example \
  | sed 's/=$//' | sort -u > "${documented}"
grep -oE '^[A-Z0-9_]+=' roles/scampatrol/templates/scampatrol.env.j2 \
  | sed 's/=$//' | grep -v '^IMAGE_NAME$' | sort -u > "${rendered}"

if ! cmp -s "${documented}" "${rendered}"; then
  echo "The Ansible .env template has drifted from ../.env.example:"
  diff -u "${documented}" "${rendered}" || true
  exit 1
fi

ansible-galaxy collection install -r requirements.yml
ansible-playbook -i inventory/production.example.yml playbook.yml --syntax-check
ansible-lint playbook.yml roles/
# <Rebecca End>
