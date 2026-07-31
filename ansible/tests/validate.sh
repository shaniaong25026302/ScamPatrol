#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ansible_dir="$(cd -- "${script_dir}/.." && pwd)"
cd "${ansible_dir}"

ansible-galaxy collection install -r requirements.yml
ansible-playbook -i inventory/production.example.yml playbook.yml --syntax-check
ansible-lint playbook.yml roles/

