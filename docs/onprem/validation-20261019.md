# 온프레미스 앱 배포 검증 결과

2026-10-19 KST, VM에서 실행한 결과를 기준으로 정리했다. 내부 경로·호스트 IP·백업 파일명·인증 값은 이 게시용 요약에서 제외했다.

| 항목 | 결과 |
| --- | --- |
| Kubernetes | Control Plane 1개·Worker 2개 Ready |
| 앱 배포 | frontend/backend 각 1개, 모두 준비 완료 |
| 진입 경로 | Traefik NodePort + Ingress, PC 브라우저 접속 성공 |
| HTTP | 프론트엔드 200, 로그인 전 보호 API 401 |
| PostgreSQL | 앱 계정은 슈퍼유저 아님, Flyway V1~V7 성공 |
| 앱 기능 | 회원가입·로그인·프로젝트·업무 생성·상태 변경·새로고침·재로그인 성공 |
| 데이터 저장 | 테스트 프로젝트의 task_count=1 |
| 영속성 | PostgreSQL Pod 재생성 및 VM 재기동 후 테스트 행 유지 |
| Redis | 인증·SET/GET, 실제 GitHub 응답 키 생성 확인 |
| 캐시 재사용 | hits 0→10→64, misses 0→25→50 |
| DB 백업 | pg_dump custom 형식, 호스트 복사본 SHA256 일치 |
| DB 복원 | 별도 DB에서 프로젝트·업무 수, V1~V7 성공 기록, 영속성 테스트 행 확인 |

복원은 --no-owner --no-privileges로 수행한 스키마·데이터 검증이다. 역할·비밀번호·권한 복구 및 복원 DB로 앱을 전환한 검증은 포함하지 않는다. 백업의 호스트 복사본도 동일 PC에 있으므로 외부 백업은 아니다. 정기 실행·보존 정책·외부 보관은 후속 작업이다.

관측 시 메모리는 backend=334Mi, frontend=5Mi, PostgreSQL=69Mi, Redis=16Mi였다. 호스트 메모리 제약으로 이미지 빌드는 GitHub 호스팅 러너에서 수행하고 앱은 각 1개로 시작했다. 이 수치는 부하 테스트나 최대 사용량 보장이 아니다.

재기동 중 API·Calico 지연 및 커널 지연 기록이 있었고, 이후 전체 Pod·DB·Redis·HTTP 정상 복구를 확인했다. 원인은 확정되지 않았으며 호스트 여유 메모리와 VirtualBox 상태를 계속 확인한다.

미완료: Argo CD, 셀프호스티드 러너, 자동 GitOps 배포·롤백, Redis 중단 시 앱 동작 검증, Prometheus 실데이터·D3·Alertmanager 연동, TLS·소셜 로그인, 외부 백업. PostgreSQL 로컬 PV는 한 Worker에 종속되고 현재 앱은 단일 replica다.

참조:
- PR #26: https://github.com/Team-likelion-3rd-Project/likelion-devops-7th-3rd-team02/pull/26
- 이미지 게시 성공: https://github.com/Team-likelion-3rd-Project/likelion-devops-7th-3rd-team02/actions/runs/39093857520
