# 온프레미스 매니페스트 검증

검증일: 2026-10-19

## 통과
- YAML 파싱 및 Service·Ingress 연결 검사
- Secret 값 미포함 확인
- kubectl kustomize 렌더링
- kubectl apply --dry-run=server
- kubectl diff 검토

## 확인된 차이
- backend·frontend 이미지 참조: 커밋 SHA 태그 → 실행 확인한 digest
- 두 Deployment의 generation 변경
- Service 2개와 Ingress는 변경 없음

## 미완료
- digest 참조 구성의 실제 적용 및 재기동 확인
- Argo CD 연결과 자동 배포·롤백

백엔드는 Recreate 전략이므로 실제 적용 시 일시 중단이 발생할 수 있다.
DB·Redis·PV/PVC·Secret은 이번 변경의 관리 대상에 포함하지 않는다.
