variable "region" {
  description = "AWS region (ap-south-1 = Mumbai)"
  type        = string
  default     = "ap-south-1"
}

variable "instance_type" {
  description = "EC2 size. t3.micro is free-tier eligible; use t3.small if the build is too slow."
  type        = string
  default     = "t3.micro"
}

variable "public_key_path" {
  description = "SSH public key that Terraform uploads as the EC2 key pair"
  type        = string
  default     = "~/.ssh/eventhub.pub"
}

variable "private_key_path" {
  description = "Matching private key, written into the Ansible inventory"
  type        = string
  default     = "~/.ssh/eventhub"
}

variable "ssh_cidr" {
  description = "Who may SSH to the server. 0.0.0.0/0 is convenient for a lab (key-only login); narrow it to your IP for better security."
  type        = string
  default     = "0.0.0.0/0"
}

variable "repo_url" {
  description = "Public GitHub repository that Ansible deploys"
  type        = string
  default     = "https://github.com/realaps/eventhub.git"
}

variable "alert_email" {
  description = "Optional e-mail for CloudWatch alarm notifications (you must confirm the subscription e-mail). Leave empty to skip."
  type        = string
  default     = ""
}

variable "existing_instance_profile" {
  description = "AWS Academy Learner Lab cannot create IAM roles: set this to \"LabInstanceProfile\" there. Leave empty on a normal AWS account."
  type        = string
  default     = ""
}
