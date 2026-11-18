# IAM: the EC2 instance gets a role (no access keys stored on the server).
# Least privilege: CloudWatch agent/logs + read/write to ONE backup bucket + Session Manager.

locals {
  create_iam       = var.existing_instance_profile == ""
  instance_profile = local.create_iam ? one(aws_iam_instance_profile.web[*].name) : var.existing_instance_profile
}

resource "aws_iam_role" "web" {
  count = local.create_iam ? 1 : 0
  name  = "eventhub-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "cloudwatch_agent" {
  count      = local.create_iam ? 1 : 0
  role       = aws_iam_role.web[0].name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_role_policy_attachment" "ssm" {
  count      = local.create_iam ? 1 : 0
  role       = aws_iam_role.web[0].name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy" "backup_bucket" {
  count = local.create_iam ? 1 : 0
  name  = "eventhub-backup-bucket-access"
  role  = aws_iam_role.web[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = aws_s3_bucket.backup.arn
      },
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject"]
        Resource = "${aws_s3_bucket.backup.arn}/*"
      }
    ]
  })
}

resource "aws_iam_instance_profile" "web" {
  count = local.create_iam ? 1 : 0
  name  = "eventhub-ec2-profile"
  role  = aws_iam_role.web[0].name
}
