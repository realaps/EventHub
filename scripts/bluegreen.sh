#!/usr/bin/env bash
# Manual Blue-Green helper for Linux/macOS/Git Bash.
# Usage: ./scripts/bluegreen.sh status | switch blue | switch green
set -euo pipefail
cd "$(dirname "$0")/.."

status() {
  echo "LIVE colour: $(kubectl get service eventhub-bg -o jsonpath='{.spec.selector.track}')  (http://localhost:30090)"
  kubectl get deployments,pods -l app=eventhub-bg -L track
  curl -fsS http://localhost:30090/api/health && echo || echo "Live URL not reachable"
}

case "${1:-}" in
  status) status ;;
  switch)
    color="${2:?give a colour: blue or green}"
    [[ "$color" == blue || "$color" == green ]] || { echo "colour must be blue or green"; exit 1; }
    echo "Checking eventhub-$color is healthy before switching..."
    kubectl rollout status "deployment/eventhub-$color" --timeout=60s
    kubectl patch service eventhub-bg --patch-file "k8s/blue-green/patches/patch-$color.yaml"
    sleep 2
    status
    ;;
  *) echo "Usage: $0 status | switch blue | switch green"; exit 1 ;;
esac
