#!/usr/bin/env bash
# Redeploy the latest code from GitHub to the EC2 server (after you git push).
# Only re-runs Ansible; Terraform is not touched.
set -euo pipefail
cd "$(dirname "$0")/ansible"
export PATH="$HOME/.local/bin:$PATH"
ansible-playbook site.yml
