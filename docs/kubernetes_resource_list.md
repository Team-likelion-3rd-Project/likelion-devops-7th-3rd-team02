# DevFlow 2차 프로젝트 - Kubernetes 리소스 목록

## Namespace

- `Namespace/devflow`
- `Namespace/monitoring`

## Frontend

- `ConfigMap/frontend-config`
- `ServiceAccount/frontend-sa`
- `Deployment/frontend`
- `Service/frontend-service`

## Backend

- `ConfigMap/backend-config`
- `Secret/backend-secret` (실제 값은 Git에 저장하지 않음)
- `ServiceAccount/backend-sa`
- `Deployment/backend`
- `Service/backend-service`
- `HorizontalPodAutoscaler/backend-hpa`

## Ingress

- `Ingress/devflow-ingress`
  - `/` → `frontend-service`
  - `/api/*` → `backend-service`
  - `/actuator/health*` → `backend-service`

## Registry

- `Secret/gitlab-registry-secret` (`kubernetes.io/dockerconfigjson`)

## RBAC

- `ServiceAccount/gitlab-deployer`
- `Role/gitlab-deployer-role`
- `RoleBinding/gitlab-deployer-rolebinding`

## Monitoring

- Metrics Server
- Prometheus
- Grafana
- kube-state-metrics
- node-exporter
- `ServiceMonitor/backend-metrics` 또는 동등한 scrape 설정

## 선택 리소스

- `PodDisruptionBudget/frontend-pdb`
- `PodDisruptionBudget/backend-pdb`
- `NetworkPolicy/default-deny`
- `NetworkPolicy/allow-ingress-to-app`
- `NetworkPolicy/allow-backend-to-rds`

## 권장 파일 구조

```text
k8s/
├─ namespace.yaml
├─ frontend/
│  ├─ deployment.yaml
│  ├─ service.yaml
│  └─ configmap.yaml
├─ backend/
│  ├─ deployment.yaml
│  ├─ service.yaml
│  ├─ configmap.yaml
│  ├─ secret.example.yaml
│  └─ hpa.yaml
├─ ingress/
│  └─ ingress.yaml
├─ rbac/
│  ├─ serviceaccounts.yaml
│  ├─ gitlab-deployer-role.yaml
│  └─ gitlab-deployer-rolebinding.yaml
├─ registry/
│  └─ image-pull-secret.example.yaml
└─ monitoring/
   ├─ servicemonitor.yaml
   └─ grafana-dashboard.json
```

