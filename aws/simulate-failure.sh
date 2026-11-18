#!/usr/bin/env bash
# Log-monitoring + failure demo:
#  1. normal traffic (HTTP 200)  2. app container stopped -> Nginx returns 502 errors
#  3. app restarted (recovery). CloudWatch logs show it all; the 5xx alarm fires in ~5 minutes.
set -euo pipefail
cd "$(dirname "$0")"
export PATH="$HOME/.local/bin:$PATH"

IP=$(terraform -chdir=terraform output -raw public_ip)
SSH="ssh -i $HOME/.ssh/eventhub -o StrictHostKeyChecking=accept-new ec2-user@$IP"
hit() { for i in $(seq 1 "$1"); do curl -s -o /dev/null -w "%{http_code} " "http://$IP/$2"; sleep 0.3; done; echo; }

echo "==> 1. Normal traffic"
hit 20 ""
echo "==> 2. Simulating an application crash (docker stop eventhub)"
$SSH 'docker stop eventhub' >/dev/null
hit 20 ""
echo "==> 3. Recovering (docker start eventhub)"
$SSH 'docker start eventhub' >/dev/null
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://$IP/api/health")
  [ "$code" = "200" ] && break
  sleep 2
done
hit 10 ""
echo
echo "Now open CloudWatch: $(terraform -chdir=terraform output -raw dashboard_url)"
echo " - Dashboard 'EventHub': Requests vs Errors5xx graph"
echo " - Logs > Log groups > /eventhub/nginx/access : look for \"status\":502"
echo " - Alarms > eventhub-5xx-errors : goes to In alarm within ~5 minutes, then back to OK"
