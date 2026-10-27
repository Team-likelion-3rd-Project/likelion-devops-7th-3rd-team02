#!/bin/sh
set -eu

NAMESPACE="devflow"
ARGO_NS="argocd"
APP="${GITOPS_APP_NAME:-devflow}"
SYNC_TIMEOUT="${GITOPS_SYNC_TIMEOUT:-300}"

# Expected release identity (from the pipeline that triggered this release).
<<<<<<< HEAD
EXPECTED_IMAGE_TAG="${EXPECTED_IMAGE_TAG:-${CI_COMMIT_SHORT_SHA:-${GITHUB_SHA_SHORT:-$(printf '%s' "${GITHUB_SHA:-}" | cut -c1-8)}}}"
EXPECTED_CHART_SHA="${EXPECTED_CHART_SHA:-${CI_COMMIT_SHA:-${GITHUB_SHA:-}}}"
=======
EXPECTED_IMAGE_TAG="${EXPECTED_IMAGE_TAG:-${CI_COMMIT_SHORT_SHA:-}}"
EXPECTED_CHART_SHA="${EXPECTED_CHART_SHA:-${CI_COMMIT_SHA:-}}"
>>>>>>> origin/develop
: "${EXPECTED_IMAGE_TAG:?EXPECTED_IMAGE_TAG (or CI_COMMIT_SHORT_SHA) is required}"
: "${EXPECTED_CHART_SHA:?EXPECTED_CHART_SHA (or CI_COMMIT_SHA) is required}"

echo "=== Wait for Application $APP Synced/Healthy (<= ${SYNC_TIMEOUT}s) ==="
END=$(( $(date +%s) + SYNC_TIMEOUT ))
while : ; do
  SYNC=$(kubectl -n "$ARGO_NS" get application "$APP" -o jsonpath='{.status.sync.status}' 2>/dev/null || echo Unknown)
  HEALTH=$(kubectl -n "$ARGO_NS" get application "$APP" -o jsonpath='{.status.health.status}' 2>/dev/null || echo Unknown)
  echo "sync=$SYNC health=$HEALTH"
  if [ "$SYNC" = "Synced" ] && [ "$HEALTH" = "Healthy" ]; then
    break
  fi
  if [ "$(date +%s)" -ge "$END" ]; then
    echo "ERROR: Application $APP is not Synced/Healthy within ${SYNC_TIMEOUT}s"
    kubectl -n "$ARGO_NS" get application "$APP" -o wide || true
    exit 1
  fi
  sleep 10
done

echo "=== Managed resources (10 expected, no missing/unexpected extra) ==="
kubectl -n "$ARGO_NS" get application "$APP" \
  -o jsonpath='{range .status.resources[*]}{.kind}/{.name} {.status}{.health}{"\n"}{end}'

echo "=== Release identity check (expected tag $EXPECTED_IMAGE_TAG, chart $EXPECTED_CHART_SHA) ==="
CHART_REF=$(kubectl -n "$ARGO_NS" get application "$APP" \
  -o jsonpath='{.spec.sources[?(@.path=="helm/devflow")].targetRevision}')
if [ "$CHART_REF" != "$EXPECTED_CHART_SHA" ]; then
  echo "ERROR: Application chart targetRevision is '$CHART_REF', expected '$EXPECTED_CHART_SHA'"
  exit 1
fi
echo "OK      Application chart SHA = $EXPECTED_CHART_SHA"

<<<<<<< HEAD
VALUES_SOURCE=$(kubectl -n "$ARGO_NS" get application "$APP" \
  -o jsonpath='{.spec.sources[?(@.ref=="values")]}')
if [ -z "$VALUES_SOURCE" ]; then
  echo "ERROR: Application has no values source with ref=values"
  exit 1
fi
case "$VALUES_SOURCE" in
  *path*)
    echo "ERROR: values source must not define a path (renders as Helm chart dir): $VALUES_SOURCE"
    exit 1
    ;;
esac
echo "OK      values source ref=values, no path"

=======
>>>>>>> origin/develop
RELEASE_FAILED=0
for DEP in frontend backend; do
  IMG=$(kubectl -n "$NAMESPACE" get deployment "$DEP" -o jsonpath='{.spec.template.spec.containers[0].image}')
  case "$IMG" in
    *":$EXPECTED_IMAGE_TAG")
      echo "OK      deployment/$DEP image = $IMG"
      ;;
    *)
      echo "ERROR: deployment/$DEP image '$IMG' does not carry expected tag :$EXPECTED_IMAGE_TAG"
      RELEASE_FAILED=1
      ;;
  esac
done
if [ "$RELEASE_FAILED" -ne 0 ]; then
  echo "ERROR: running release does not match the expected release (stale deployment?)"
  exit 1
fi

echo "=== Rollout status ==="
kubectl rollout status deployment/frontend -n "$NAMESPACE" --timeout=180s
kubectl rollout status deployment/backend -n "$NAMESPACE" --timeout=180s

echo "=== Pods ==="
kubectl get pods -n "$NAMESPACE"

echo "=== GitOps verification completed successfully ==="
