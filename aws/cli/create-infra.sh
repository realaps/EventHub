#!/usr/bin/env bash
# VLE: "Infrastructure Creation Using AWS CLI"
# Creates: security group, key pair, S3 bucket, EC2 instance (static Nginx site via user-data),
#          EBS volume attached to the instance, and a CloudWatch CPU alarm.
# Usage:  bash cli/create-infra.sh        (delete everything afterwards with: bash cli/delete-infra.sh)
set -euo pipefail
cd "$(dirname "$0")"

REGION="${AWS_REGION:-ap-south-1}"
export AWS_DEFAULT_REGION="$REGION"
STATE=state.env

if [ -f "$STATE" ]; then
  echo "Resources from an earlier run exist (cli/state.env). Run: bash cli/delete-infra.sh"
  exit 1
fi
save() { echo "$1=$2" >> "$STATE"; echo "   $1 = $2"; }
save REGION "$REGION"

ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
echo "==> Account $ACCOUNT, region $REGION"

echo "==> 1. Security group (HTTP 80 open)"
VPC=$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true --query 'Vpcs[0].VpcId' --output text)
SG=$(aws ec2 create-security-group --group-name eventhub-cli-sg \
      --description "EventHub AWS CLI demo" --vpc-id "$VPC" --query GroupId --output text)
save SG "$SG"
aws ec2 authorize-security-group-ingress --group-id "$SG" --protocol tcp --port 80 --cidr 0.0.0.0/0 >/dev/null

echo "==> 2. Key pair"
aws ec2 create-key-pair --key-name eventhub-cli-key --query KeyMaterial --output text > eventhub-cli-key.pem
chmod 400 eventhub-cli-key.pem
save KEY eventhub-cli-key

echo "==> 3. S3 bucket (private)"
BUCKET="eventhub-cli-$ACCOUNT-$REGION"
if [ "$REGION" = "us-east-1" ]; then
  aws s3api create-bucket --bucket "$BUCKET" >/dev/null
else
  aws s3api create-bucket --bucket "$BUCKET" --create-bucket-configuration LocationConstraint="$REGION" >/dev/null
fi
save BUCKET "$BUCKET"
aws s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

echo "==> 4. EC2 instance (Amazon Linux 2023, t3.micro, user-data installs Nginx)"
AMI=$(aws ssm get-parameter --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 \
      --query Parameter.Value --output text)
INSTANCE=$(aws ec2 run-instances --image-id "$AMI" --instance-type t3.micro \
  --key-name eventhub-cli-key --security-group-ids "$SG" \
  --user-data file://static-site-userdata.sh \
  --metadata-options HttpTokens=required \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=eventhub-cli},{Key=Project,Value=EventHub}]' \
  --query 'Instances[0].InstanceId' --output text)
save INSTANCE "$INSTANCE"
echo "   waiting for the instance to be running..."
aws ec2 wait instance-running --instance-ids "$INSTANCE"
AZ=$(aws ec2 describe-instances --instance-ids "$INSTANCE" --query 'Reservations[0].Instances[0].Placement.AvailabilityZone' --output text)
IP=$(aws ec2 describe-instances --instance-ids "$INSTANCE" --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)

echo "==> 5. EBS volume (1 GB gp3) attached as /dev/sdf"
VOL=$(aws ec2 create-volume --availability-zone "$AZ" --size 1 --volume-type gp3 \
  --tag-specifications 'ResourceType=volume,Tags=[{Key=Name,Value=eventhub-cli-data},{Key=Project,Value=EventHub}]' \
  --query VolumeId --output text)
save VOLUME "$VOL"
aws ec2 wait volume-available --volume-ids "$VOL"
aws ec2 attach-volume --volume-id "$VOL" --instance-id "$INSTANCE" --device /dev/sdf >/dev/null

echo "==> 6. CloudWatch alarm (CPU > 70% for 10 min)"
aws cloudwatch put-metric-alarm --alarm-name eventhub-cli-high-cpu \
  --namespace AWS/EC2 --metric-name CPUUtilization \
  --dimensions Name=InstanceId,Value="$INSTANCE" \
  --statistic Average --period 300 --evaluation-periods 2 \
  --threshold 70 --comparison-operator GreaterThanThreshold
save ALARM eventhub-cli-high-cpu

echo "==> 7. Upload a backup copy of the site definition to S3"
aws s3 cp static-site-userdata.sh "s3://$BUCKET/backups/static-site-userdata-$(date +%Y%m%d%H%M).sh" --only-show-errors

echo
echo "================ CREATED (take screenshots) ================"
aws ec2 describe-instances --instance-ids "$INSTANCE" \
  --query 'Reservations[].Instances[].{ID:InstanceId,Type:InstanceType,State:State.Name,IP:PublicIpAddress,AZ:Placement.AvailabilityZone}' --output table
aws ec2 describe-volumes --volume-ids "$VOL" \
  --query 'Volumes[].{Volume:VolumeId,SizeGB:Size,Type:VolumeType,State:State,AttachedTo:Attachments[0].InstanceId}' --output table
aws ec2 describe-security-groups --group-ids "$SG" \
  --query 'SecurityGroups[].IpPermissions[].{Port:FromPort,From:IpRanges[0].CidrIp}' --output table
echo "S3 bucket contents:"; aws s3 ls "s3://$BUCKET" --recursive
aws cloudwatch describe-alarms --alarm-names eventhub-cli-high-cpu \
  --query 'MetricAlarms[].{Alarm:AlarmName,State:StateValue,Threshold:Threshold}' --output table
echo
echo "Website (wait 1-2 minutes for Nginx to install):  http://$IP"
echo "When finished:  bash cli/delete-infra.sh"
