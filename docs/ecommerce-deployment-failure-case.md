# Case Scenario: Deployment Failure in an E-commerce Company

**VLE item:** E-commerce deployment-failure case scenario (3 marks)
**Approach:** explain the failure, find the root causes, and show how the DevOps practices built in EventHub prevent them or reduce the damage.

## 1. Scenario

An online store releases a new checkout version on a Friday evening, just before a sale. Engineers copy files to each server by hand over SSH and edit configuration files directly on the servers. One of the three servers gets an old configuration value, so its payment calls fail. Customers see errors on roughly one checkout in three. Nobody notices for 40 minutes, until customers complain on social media. Rolling back takes another hour, because no one is sure which files changed and the previous version was never kept.

**Impact:** lost orders during the busiest window, a damaged reputation, a stressed team, and no record of what went wrong.

## 2. Root causes

| # | Root cause | Why it caused the failure |
|---|---|---|
| 1 | Manual deployment, server by server | Human error: the servers ended up different ("configuration drift") |
| 2 | No automated tests before release | The broken build reached production |
| 3 | No versioned build artefact | There was no exact "previous version" to return to |
| 4 | Changes went straight to live traffic | All users were exposed immediately |
| 5 | No monitoring or alerting | The failure was found by customers, not by the team |
| 6 | No rollback plan | Recovery took over an hour |
| 7 | Infrastructure set up by hand | A fresh server could not be rebuilt reliably |

## 3. Solution: how each practice fixes a cause (as implemented in EventHub)

| Practice | Tool used in EventHub | Fixes cause | What it does |
|---|---|---|---|
| Version control | Git + GitHub | 1, 3 | Every change is a commit, so we always know exactly what changed and who changed it |
| Continuous Integration | Jenkins `Validate` stage (type check + unit tests) | 2 | A failing test **stops the pipeline before deployment** (shown in the demo) |
| Immutable, versioned images | Docker image `eventhub:<build-number>` | 1, 3 | The same image runs everywhere. The previous image is still there to roll back to |
| Automated deployment | Jenkins → `kubectl apply` + `rollout status` | 1 | No manual copying. Every server gets an identical configuration |
| Zero-downtime release | Kubernetes rolling update (`maxUnavailable: 0`) + readiness probes | 4 | New Pods get traffic only after `/api/health` answers |
| Blue-Green deployment | `Jenkinsfile.bluegreen` | 4, 6 | The new version is tested on the idle colour first. Traffic is switched only after approval |
| Automatic rollback | `kubectl rollout undo` / switching the Service selector back | 6 | Recovery takes **seconds** instead of an hour |
| Infrastructure as Code | Terraform | 7 | The whole server environment is rebuilt identically with `terraform apply` |
| Configuration management | Ansible playbook | 1, 7 | Server setup is written down, repeatable and the same on every server |
| Monitoring & alerting | CloudWatch metrics, Nginx JSON logs, 5xx metric filter, alarms + SNS | 5 | The team is alerted within ~5 minutes of errors, before customers complain |
| Backups | Daily backup to the EBS volume and to S3 (versioned) | 6, 7 | Code and configuration can be restored |
| Least-privilege access | IAM role on EC2 (no stored keys) | n/a | Lowers the security risk during automation |

## 4. The same incident with the DevOps pipeline

1. The developer pushes the change. Jenkins runs the tests. *If the bug is caught here, nothing is deployed.*
2. If the bug isn't caught by a test, the new image is deployed to the **idle (green)** environment while **blue keeps serving customers**.
3. The health check on green fails, or the team spots the error on the preview URL. **The switch is never approved.** Customers are not affected.
4. Suppose the problem only shows up after the switch. CloudWatch then sees 5xx errors in the Nginx logs and the alarm notifies the team. They switch the Service selector back to blue, or the pipeline does it automatically, and recovery takes **under a minute**.
5. The Git history and the Jenkins build logs show exactly which commit caused the failure, so the team can find and fix it.

**Demonstrated in this project:**
- `simulate-failure.sh` stops the app, which produces 502 errors in the CloudWatch logs and fires the alarm, then recovers.
- The Jenkins demo shows a failed test stopping deployment.
- `bluegreen.ps1 switch blue` shows an instant rollback.

## 5. Recommendations for the company

- Freeze releases before big sales, or release behind Blue-Green with a manual approval step.
- Make "pipeline-only" deployments the rule: no SSH changes on production servers.
- Track the four key DevOps metrics: deployment frequency, lead time for changes, change failure rate, and time to restore service.
- Hold a blameless post-incident review and add a test for every production bug.
