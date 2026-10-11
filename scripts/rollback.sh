#!/bin/sh
set -eu

NAMESPACE="devflow"

echo "=== Current Rollout History ==="
kubectl rollout history deployment/frontend -n "$NAMESPACE"
kubectl rollout history deployment/backend -n "$NAMESPACE"

echo "=== Rollback Frontend ==="
kubectl rollout undo deployment/frontend -n "$NAMESPACE"

echo "=== Rollback Backend ==="
kubectl rollout undo deployment/backend -n "$NAMESPACE"

echo "=== Check Frontend Rollback Status ==="
kubectl rollout status deployment/frontend -n "$NAMESPACE" --timeout=180s

echo "=== Check Backend Rollback Status ==="
kubectl rollout status deployment/backend -n "$NAMESPACE" --timeout=180s

echo "=== Current Deployment Images ==="
kubectl get deployment frontend -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[*].image}'
echo
kubectl get deployment backend -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[*].image}'
echo

echo "=== Current Pods ==="
kubectl get pods -n "$NAMESPACE"

echo "=== Rollback completed successfully ==="
