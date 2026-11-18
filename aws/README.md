# EventHub on AWS: step-by-step guide

Everything runs from **AWS CloudShell**, a free Linux terminal inside the AWS website. **Nothing needs installing on your laptop** for this part, and no access keys are stored anywhere.

## What each part covers

| VLE / practice item | What you run | What it creates or shows |
|---|---|---|
| Infrastructure creation using AWS CLI (3) | `bash cli/create-infra.sh` | Security group, key pair, S3 bucket, EC2 with a static Nginx site, attached EBS volume, CPU alarm |
| Deploy/configure EC2 using Terraform and Ansible (3) | `bash deploy-all.sh` | Terraform: EC2, EBS, S3, IAM role, CloudWatch. Ansible: Docker, Nginx, app, monitoring, backups |
| Static website hosting with EC2 + S3 backup + CloudWatch (3) | same as above | EventHub on `http://<EC2-IP>` · daily backups in S3 · CloudWatch metrics, alarms and dashboard |
| Log monitoring using EC2 + CloudWatch (3) | `bash simulate-failure.sh` | Nginx and app logs in CloudWatch Logs, a 5xx metric filter, and an alarm that fires |
| Automated cloud-native deployment with monitoring (3) | `deploy-all.sh`, then `update-app.sh` | One command builds and deploys a container from GitHub, with monitoring included |
| E-commerce deployment-failure scenario (3) | read `../docs/ecommerce-deployment-failure-case.md` | Written answer, backed by the demos above |
| Practices: EC2, S3, IAM, CloudWatch, EBS, Linux shell, Terraform, Terraform-managed S3, Ansible playbook, Ansible website deploy | all of the above | Terraform files in `terraform/`, playbook in `ansible/site.yml`, scripts in this folder |

## Cost safety (read this first)

- Everything uses free-tier-sized resources (t3.micro, small disks), and the region is **ap-south-1 (Mumbai)**.
- **Run the delete commands when you finish each session.** That's `bash cli/delete-infra.sh` and `bash destroy-all.sh`. You can recreate everything in about 15 minutes.
- Recommended: in the AWS console, go to **Billing → Budgets → Create budget → "Zero spend budget"**. You'll get an e-mail if anything starts costing money.

---

## Step 1: Open CloudShell (2 min)
1. Log in to the AWS console. In the top-right corner, set the region to **Asia Pacific (Mumbai) ap-south-1**.
2. Click the **CloudShell** icon (`>_`) in the top bar and wait for the terminal to open.

> **Using AWS Academy Learner Lab instead?** Start the lab and open the AWS console from it. If CloudShell isn't allowed, use the lab's own terminal, which runs the same commands. Learner Lab usually only allows us-east-1 and doesn't allow creating IAM roles, so run `export AWS_REGION=us-east-1` and add `-var region=us-east-1 -var existing_instance_profile=LabInstanceProfile` to `deploy-all.sh` and `destroy-all.sh`.

## Step 2: Get the project and the tools (5 min)
```bash
git clone https://github.com/realaps/eventhub.git
cd eventhub/aws
bash setup-cloudshell.sh
source ~/.bashrc
```
✅ You should see Terraform, Ansible and AWS CLI versions, plus your account number.

## Step 3: AWS CLI infrastructure demo (10 min)
```bash
bash cli/create-infra.sh
```
✅ It prints tables for the instance, volume, security group, bucket and alarm. After 1–2 minutes, open the `http://<IP>` it prints and you'll see the static EventHub page.
📸 Screenshot the terminal tables, the web page, and in the console: EC2 → Instances, EC2 → Volumes, the S3 bucket, and CloudWatch → Alarms.

Then delete it:
```bash
bash cli/delete-infra.sh
```

## Step 4: Terraform + Ansible full deployment (20 min, mostly waiting)
```bash
bash deploy-all.sh
```
- Terraform shows the resources it's creating (`Apply complete! Resources: ~25 added`).
- Ansible then runs about 30 tasks. The **"Build the Docker image"** task takes 5–10 minutes on the small server, which is normal.
- At the end it prints the URL, for example `http://13.x.x.x`.

✅ Open the URL to see the full EventHub app. The version badge reads `ec2-<commit>`.
📸 Screenshot:
- `Apply complete!` and the outputs
- the Ansible `PLAY RECAP` with `failed=0`
- the app in the browser
- EC2 → the `eventhub-web` instance, its IAM role, and Storage (2 volumes)
- S3 → `eventhub-backup-…` → `backups/` (a `.tar.gz` file is there)
- CloudWatch → Dashboards → **EventHub**
- CloudWatch → Log groups → `/eventhub/nginx/access` and `/eventhub/app`

## Step 5: Log monitoring + failure demo (10 min)
Open the app in your browser and click around a few times. Then run:
```bash
bash simulate-failure.sh
```
✅ The output shows `200 200 …`, then `502 502 …` while the app is down, then `200` again.
Wait about 5 minutes, then check in CloudWatch:
- **Alarms → eventhub-5xx-errors** shows **In alarm**, and goes back to OK later
- the **Dashboard** shows a spike in the Errors5xx graph
- **Log groups → /eventhub/nginx/access** has lines with `"status":502`
- **Logs Insights**: choose `/eventhub/nginx/access` and run:
  ```
  fields @timestamp, status, request | filter status >= 500 | sort @timestamp desc
  ```
📸 Screenshot all of these. They're the evidence for log monitoring and for the e-commerce failure case.

## Step 6: Show automated redeployment (optional, 10 min)
On your laptop, change some visible text in the app, then commit and push to GitHub. Then in CloudShell:
```bash
bash update-app.sh
```
✅ Refresh the site: you'll see the new text and a new `ec2-<commit>` badge. Ansible only changed what was needed.

## Step 7: Delete everything (5 min)
```bash
bash destroy-all.sh
```
✅ `Destroy complete!`. Check in EC2 that the instances are terminated.

> Keep the `eventhub` folder in CloudShell until you've run `destroy-all.sh`. It holds the Terraform state that `destroy-all.sh` needs.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `terraform: command not found` | Run `source ~/.bashrc` (or run `setup-cloudshell.sh` again) |
| `Error: ... eventhub-key already exists` / `EntityAlreadyExists` | Left over from an earlier run: `bash destroy-all.sh`, then deploy again |
| `AccessDenied` creating an IAM role (Learner Lab) | Add `-var existing_instance_profile=LabInstanceProfile` |
| Ansible `UNREACHABLE` | The server is still booting. Wait 1 minute and run `bash update-app.sh` |
| Docker build killed / takes forever | Use a bigger server: `bash deploy-all.sh -var instance_type=t3.small` |
| Nothing in the 5xx graph | Metrics take 1–5 minutes. Make sure you opened the site before running the failure script |
| `git clone` asks for a password | The GitHub repo must be **Public** |

## Files
```
aws/
├── setup-cloudshell.sh       installs Terraform + Ansible, creates SSH key
├── deploy-all.sh             Terraform apply + Ansible playbook
├── update-app.sh             redeploy latest GitHub code (Ansible only)
├── simulate-failure.sh       stop/start the app to show logs, 5xx metric and alarm
├── destroy-all.sh            terraform destroy
├── cli/                      AWS CLI demo (create-infra.sh, delete-infra.sh, static-site-userdata.sh)
├── terraform/                main.tf (EC2, EBS, SG), iam.tf, s3.tf, cloudwatch.tf, variables.tf, outputs.tf
└── ansible/                  site.yml, nginx + backup templates, CloudWatch agent config
```
