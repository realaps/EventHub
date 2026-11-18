output "website_url" {
  value = "http://${aws_instance.web.public_ip}"
}

output "instance_id" {
  value = aws_instance.web.id
}

output "public_ip" {
  value = aws_instance.web.public_ip
}

output "ssh_command" {
  value = "ssh -i ${var.private_key_path} ec2-user@${aws_instance.web.public_ip}"
}

output "backup_bucket" {
  value = aws_s3_bucket.backup.bucket
}

output "data_volume_id" {
  value = aws_ebs_volume.data.id
}

output "dashboard_url" {
  value = "https://${var.region}.console.aws.amazon.com/cloudwatch/home?region=${var.region}#dashboards:name=EventHub"
}
