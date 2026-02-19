#!/usr/bin/env bash
# ============================================================
# Task Manager — Testkube automation script
#
# Usage:
#   ./testkube/run-tests.sh [unit|integration|e2e|all]
#
# Prerequisites:
#   - kubectl configured and pointing at your cluster
#   - Testkube CLI 2.x installed (https://docs.testkube.io/installing)
#   - Testkube deployed in the "testkube" namespace
# ============================================================

set -euo pipefail

NAMESPACE="testkube"
MANIFESTS_DIR="$(cd "$(dirname "$0")" && pwd)"
MODE="${1:-all}"

log() { echo "[$(date '+%H:%M:%S')] $*"; }
err() { echo "[ERROR] $*" >&2; exit 1; }

check_deps() {
  command -v kubectl >/dev/null 2>&1 || err "kubectl not found. Please install kubectl."
  command -v testkube >/dev/null 2>&1 || err "Testkube CLI not found. Install: https://docs.testkube.io/installing"
  kubectl cluster-info >/dev/null 2>&1 || err "kubectl cannot reach cluster. Check your kubeconfig."
}

apply_manifests() {
  log "Applying TestWorkflow manifests..."
  testkube create testworkflow \
    --file "${MANIFESTS_DIR}/test-unit.yaml" \
    --namespace "${NAMESPACE}" \
    --update

  testkube create testworkflow \
    --file "${MANIFESTS_DIR}/test-integration.yaml" \
    --namespace "${NAMESPACE}" \
    --update

  testkube create testworkflow \
    --file "${MANIFESTS_DIR}/test-e2e.yaml" \
    --namespace "${NAMESPACE}" \
    --update

  testkube create testworkflow \
    --file "${MANIFESTS_DIR}/testsuite.yaml" \
    --namespace "${NAMESPACE}" \
    --update

  log "Manifests applied."
}

run_workflow() {
  local workflow_name="$1"
  log "Running TestWorkflow: ${workflow_name}"
  testkube run testworkflow "${workflow_name}" \
    --namespace "${NAMESPACE}" \
    --watch
}

print_results() {
  log "Fetching latest execution results..."
  local workflows=("task-manager-unit" "task-manager-integration" "task-manager-e2e" "task-manager-suite")
  for name in "${workflows[@]}"; do
    echo ""
    echo "--- ${name} ---"
    testkube get testworkflowexecution \
      --namespace "${NAMESPACE}" \
      --testworkflow "${name}" \
      --limit 1 2>/dev/null || true
  done
}

# ---- Main ----
check_deps
apply_manifests

case "${MODE}" in
  unit)
    run_workflow "task-manager-unit"
    ;;
  integration)
    run_workflow "task-manager-integration"
    ;;
  e2e)
    run_workflow "task-manager-e2e"
    ;;
  all)
    run_workflow "task-manager-suite"
    ;;
  *)
    err "Unknown mode '${MODE}'. Use: unit | integration | e2e | all"
    ;;
esac

print_results
log "Done."
