#!/usr/bin/env bash
# <Rebecca Start>
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ansible_dir="$(cd -- "${script_dir}/.." && pwd)"
cd "${ansible_dir}"

inventory_file="${1:-inventory/production.yml}"
variables_file="${2:-vars/production.yml}"
shift "$(( $# >= 2 ? 2 : $# ))"

run_timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
evidence_root="${ANSIBLE_EVIDENCE_DIR:-${ansible_dir}/evidence}"
evidence_dir="${evidence_root}/${run_timestamp}"
mkdir -p "${evidence_dir}"

first_log="${evidence_dir}/run-1.log"
second_log="${evidence_dir}/run-2.log"
summary_file="${evidence_dir}/summary.txt"

run_playbook() {
  ansible-playbook \
    -i "${inventory_file}" \
    playbook.yml \
    --extra-vars "@${variables_file}" \
    "$@"
}

echo "Run 1/2: converge the server"
run_playbook "$@" | tee "${first_log}"

echo "Run 2/2: prove no task changes"
run_playbook "$@" | tee "${second_log}"

if grep -Eq 'changed=[1-9]|unreachable=[1-9]|failed=[1-9]' "${second_log}"; then
  printf '%s\n' "IDEMPOTENCY FAILED" "Evidence: ${evidence_dir}" > "${summary_file}"
  echo "IDEMPOTENCY FAILED: the second run changed something or reported an error."
  echo "Evidence retained in ${evidence_dir}"
  exit 1
fi

if ! grep -Eq 'changed=0 .*unreachable=0 .*failed=0' "${second_log}"; then
  printf '%s\n' "IDEMPOTENCY FAILED" "Evidence: ${evidence_dir}" > "${summary_file}"
  echo "IDEMPOTENCY FAILED: no clean PLAY RECAP line was found."
  echo "Evidence retained in ${evidence_dir}"
  exit 1
fi

{
  echo "IDEMPOTENCY PASSED"
  grep -E 'PLAY RECAP|changed=0 .*unreachable=0 .*failed=0' "${second_log}" | tail -2
  echo "Evidence: ${evidence_dir}"
} > "${summary_file}"

echo "IDEMPOTENCY PASSED: the second run finished with changed=0 and failed=0."
echo "Evidence retained in ${evidence_dir}"
# <Rebecca End>
