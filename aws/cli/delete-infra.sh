#!/usr/bin/env bash
# Deletes everything created by cli/create-infra.sh (so you are not billed).
set -uo pipefail
cd "$(dirname "$0")"

[ -f state.env ] || { echo "Nothing to delete (cli/state.env not found)."; exit 0; }
# shellcheck disable=SC1091
source state.env
export AWS_DEFAULT_REGION="${REGION:-ap-south-1}"

if [ -n "${ALARM:-}" ]; then
  echo "==> Deleting alarm $ALARM"
  aws cloudwatch delete-alarms --alarm-names "$ALARM"
fi

if [ -n "${INSTANCE:-}" ]; then
  echo "==> Terminating instance $INSTANCE (about 1 minute)"
  aws ec2 terminate-instances --instance-ids "$INSTANCE" >/dev/null
  aws ec2 wait instance-terminated --instance-ids "$INSTANCE"
fi

if [ -n "${VOLUME:-}" ]; then
  echo "==> Deleting EBS volume $VOLUME"
  aws ec2 wait volume-available --volume-ids "$VOLUME"
  aws ec2 delete-volume --volume-id "$VOLUME"
fi

if [ -n "${SG:-}" ]; then
  echo "==> Deleting security group $SG"
  for i in 1 2 3 4 5 6; do
    aws ec2 delete-security-group --group-id "$SG" 2>/dev/null && break
    sleep 10   # the network interface can take a moment to be released
  done
fi

if [ -n "${KEY:-}" ]; then
  echo "==> Deleting key pair $KEY"
  aws ec2 delete-key-pair --key-name "$KEY"
  rm -f eventhub-cli-key.pem
fi

if [ -n "${BUCKET:-}" ]; then
  echo "==> Deleting bucket $BUCKET"
  aws s3 rb "s3://$BUCKET" --force
fi

rm -f state.env
echo "All AWS CLI demo resources deleted."
