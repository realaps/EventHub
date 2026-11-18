#!/usr/bin/env bash
# VLE: "Deploy/configure EC2 using Terraform and Ansible" + "Automated cloud-native deployment with monitoring"
# One command: Terraform creates the AWS resources, Ansible configures the server and deploys EventHub.
# Usage:  bash deploy-all.sh                      (normal AWS account)
#         bash deploy-all.sh -var existing_instance_profile=LabInstanceProfile   (AWS Academy Learner Lab)
#         bash deploy-all.sh -var alert_email=you@example.com                    (e-mail alarms)
set -euo pipefail
cd "$(dirname "$0")"
export PATH="$HOME/.local/bin:$PATH"

echo "==> [1/3] Terraform: create EC2, EBS, S3, IAM, CloudWatch"
terraform -chdir=terraform init -input=false
terraform -chdir=terraform apply -auto-approve -input=false "$@"

echo "==> [2/3] Ansible: configure server and deploy EventHub (10-15 minutes the first time)"
(cd ansible && ansible-playbook site.yml)

echo "==> [3/3] Result"
terraform -chdir=terraform output
