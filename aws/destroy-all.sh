#!/usr/bin/env bash
# Deletes EVERYTHING Terraform created (EC2, EBS, S3 bucket + backups, IAM role, CloudWatch items).
# Run this after you have taken your screenshots so you are not billed.
set -euo pipefail
cd "$(dirname "$0")"
export PATH="$HOME/.local/bin:$PATH"
terraform -chdir=terraform destroy -auto-approve -input=false "$@"
rm -f ansible/inventory.ini
echo "All Terraform-managed EventHub resources deleted."
