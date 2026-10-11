#!/bin/sh
set -eu

NAMESPACE="devflow"
CLUSTER_NAME="${EKS_CLUSTER_NAME:-devflow-dev-eks}"
AWS_REGION="${AWS_REGION:-ap-northeast-1}"


echo "=== Configure EKS ==="

aws eks update-kubeconfig \
  --region "$AWS_REGION" \
  --name "$CLUSTER_NAME"

echo "=== Apply Kubernetes manifests ==="

kubectl apply -f k8s/namespace.yaml

kubectl apply -f k8s/frontend/serviceaccount.yaml
kubectl apply -f k8s/frontend/configmap.yaml
kubectl apply -f k8s/frontend/service.yaml

echo "=== Apply Frontend Deployment ==="

sed "s|<IMAGE_TAG>|$CI_COMMIT_SHORT_SHA|g" \
  k8s/frontend/deployment.yaml | kubectl apply -f -

kubectl apply -f k8s/backend/serviceaccount.yaml

echo "=== Apply Backend ConfigMap ==="

: "${RDS_HOST:?RDS_HOST CI/CD variable is required}"

kubectl create configmap backend-config \
  -n "$NAMESPACE" \
  --from-literal=DB_URL="jdbc:postgresql://${RDS_HOST}:5432/deflow_db" \
  --from-literal=JWT_EXPIRATION="3600000" \
  --from-literal=SERVER_PORT="8080" \
  --from-literal=SPRING_PROFILES_ACTIVE="dev" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl apply -f k8s/backend/service.yaml

echo "=== Apply Backend Deployment ==="

sed "s|<IMAGE_TAG>|$CI_COMMIT_SHORT_SHA|g" \
  k8s/backend/deployment.yaml | kubectl apply -f -

kubectl apply -f k8s/backend/hpa.yaml

echo "=== Check Frontend Rollout ==="

kubectl rollout status deployment/frontend \
  -n "$NAMESPACE" \
  --timeout=180s

echo "=== Check Backend Rollout ==="

kubectl rollout status deployment/backend \
  -n "$NAMESPACE" \
  --timeout=180s

echo "=== Current Pods ==="

kubectl get pods -n "$NAMESPACE"

echo "=== Deployment completed successfully ==="
