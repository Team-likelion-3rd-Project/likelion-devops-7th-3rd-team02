#!/bin/sh
set -eu

NAMESPACE="${NAMESPACE:-devflow}"
CHART="${CHART_PATH:-helm/devflow}"
VALUES_FILE="${1:?usage: check-gitops-adoption.sh <values/aws-dev.yaml path>}"

RENDERED=$(mktemp)
RESULTS=$(mktemp)
DIFF_LOG=$(mktemp)
trap 'rm -f "$RENDERED" "$RESULTS" "$RESULTS.desired" "$DIFF_LOG"' EXIT
STATUS=0

echo "=== Render chart ==="
helm template devflow "$CHART" -f "$VALUES_FILE" > "$RENDERED"
DESIRED_COUNT=$(grep -c '^kind: ' "$RENDERED")
echo "rendered resources: $DESIRED_COUNT (expected: 10)"

echo "=== Identity check: kind/namespace/name desired vs live ==="
awk '
  function emit() {
    if (kind != "" && name != "") print kind "|" ns "|" name
  }
  /^kind: /        { kind = $2 }
  /^  name: /      { name = $2 }
  /^  namespace: / { ns = $2 }
  /^---$/          { emit(); kind = ""; ns = ""; name = "" }
  END              { emit() }
' "$RENDERED" > "$RESULTS.desired"

while IFS='|' read -r KIND NS NAME; do
  LIVE=$(kubectl -n "${NS:-$NAMESPACE}" get "$(echo "$KIND" | tr 'A-Z' 'a-z')" "$NAME" -o jsonpath='{.metadata.name}' 2>/dev/null || true)
  if [ "$LIVE" = "$NAME" ]; then
    echo "OK      $KIND/$NAME (ns $NS) exists"
  else
    echo "MISSING $KIND/$NAME (ns $NS) not found in cluster"
    STATUS=1
  fi
done < "$RESULTS.desired"

echo "=== Rendered vs live diff (kubectl diff exit-code semantics) ==="
if kubectl diff -f "$RENDERED" > "$DIFF_LOG" 2>&1; then
  DIFF_RC=0
else
  DIFF_RC=$?
fi
case "$DIFF_RC" in
  0)
    echo "kubectl diff exit 0: rendered state identical to live"
    ;;
  1)
    echo "kubectl diff exit 1: DIFFERENCES PRESENT — inspect below/manually before first sync"
    sed -n '1,40p' "$DIFF_LOG"
    ;;
  *)
    echo "ERROR: kubectl diff failed with exit $DIFF_RC (not a diff, a tool/API error) — validation FAILED"
    sed -n '1,20p' "$DIFF_LOG"
    STATUS=1
    ;;
esac

if [ "$DESIRED_COUNT" -ne 10 ]; then
  echo "ERROR: expected 10 rendered resources, got $DESIRED_COUNT"
  STATUS=1
fi
if [ "$STATUS" -eq 0 ]; then
  echo "=== Adoption identity check passed ==="
else
  echo "=== Adoption identity check FAILED ==="
fi
exit "$STATUS"
