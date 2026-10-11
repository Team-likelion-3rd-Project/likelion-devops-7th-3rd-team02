#!/bin/sh
set -eu

NAMESPACE="devflow"

echo "=== Check Deployments ==="
kubectl get deployment frontend -n "$NAMESPACE"
kubectl get deployment backend -n "$NAMESPACE"

echo "=== Check Pods ==="
kubectl get pods -n "$NAMESPACE"

echo "=== Check Services ==="
kubectl get service frontend-service -n "$NAMESPACE"
kubectl get service backend-service -n "$NAMESPACE"

echo "=== Check Frontend Rollout ==="
kubectl rollout status deployment/frontend -n "$NAMESPACE" --timeout=180s

echo "=== Check Backend Rollout ==="
kubectl rollout status deployment/backend -n "$NAMESPACE" --timeout=180s

echo "=== Check Backend Readiness Endpoint ==="
BACKEND_POD=$(kubectl get pods -n "$NAMESPACE" -l app=backend -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n "$NAMESPACE" "$BACKEND_POD" -- wget -qO- http://localhost:8080/actuator/health/readiness

echo
echo "=== Check Backend Liveness Endpoint ==="
kubectl exec -n "$NAMESPACE" "$BACKEND_POD" -- wget -qO- http://localhost:8080/actuator/health/liveness

echo
echo "=== Health check completed successfully ==="
