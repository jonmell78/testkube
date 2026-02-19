#!/usr/bin/env bash
# ============================================================
# Task Manager — Testkube automation script
#
# Usage:
#   ./testkube/run-tests.sh [unit|integration|e2e|all]
#
# Prerequisites:
#   - kubectl configured and pointing at your cluster
#   - Testkube CLI installed (https://docs.testkube.io/installing)
#   - Testkube deployed in the "testkube" namespace
# ============================================================

set -euo pipefail

NAMESPACE="testkube"
SUITE="task-manager-suite"
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
  log "Applying Testkube manifests..."
  kubectl apply -f "${MANIFESTS_DIR}/test-unit.yaml"
  kubectl apply -f "${MANIFESTS_DIR}/test-integration.yaml"
  kubectl apply -f "${MANIFESTS_DIR}/test-e2e.yaml"
  kubectl apply -f "${MANIFESTS_DIR}/testsuite.yaml"
  log "Manifests applied."
}

run_test() {
  local test_name="$1"
  log "Running test: ${test_name}"
  testkube run test "${test_name}" \
    --namespace "${NAMESPACE}" \
    --watch \
    --verbose
}

run_suite() {
  log "Running full test suite: ${SUITE}"
  testkube run testsuite "${SUITE}" \
    --namespace "${NAMESPACE}" \
    --watch \
    --verbose
}

print_results() {
  log "Fetching recent test results..."
  echo ""
  echo "--- Unit test results ---"
  testkube get testexecutions --test task-manager-unit --namespace "${NAMESPACE}" --limit 1 2>/dev/null || true

  echo ""
  echo "--- Integration test results ---"
  testkube get testexecutions --test task-manager-integration --namespace "${NAMESPACE}" --limit 1 2>/dev/null || true

  echo ""
  echo "--- E2E test results ---"
  testkube get testexecutions --test task-manager-e2e --namespace "${NAMESPACE}" --limit 1 2>/dev/null || true
}

# ---- Main ----
check_deps
apply_manifests

case "${MODE}" in
  unit)
    run_test "task-manager-unit"
    ;;
  integration)
    run_test "task-manager-integration"
    ;;
  e2e)
    run_test "task-manager-e2e"
    ;;
  all)
    run_suite
    ;;
  *)
    err "Unknown mode '${MODE}'. Use: unit | integration | e2e | all"
    ;;
esac

print_results
log "Done."
