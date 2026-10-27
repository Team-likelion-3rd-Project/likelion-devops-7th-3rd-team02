# M4 이미지 취약점 검사

Backend·Frontend 최종 이미지를 Trivy v0.70.0으로 검사한다.
PR은 로컬 Docker archive, develop은 GHCR에 게시한 digest를 사용한다.
Trivy Action과 보고서 업로드 Action은 커밋 SHA로 고정했다.

## 초기 정책

취약점 발견은 보고만 하며 빌드를 차단하지 않는다. 검사 실행 실패는 job 실패로 처리한다.
JSON과 대상 커밋·digest 메타데이터는 Actions artifact로 14일 보관한다.
Actions 요약의 건수는 고유 CVE 수가 아닌 패키지별 발견 건수다.
수정 버전이 없는 취약점도 보고서에 포함한다.

## 검증 및 후속 작업

로컬 YAML 파싱과 샘플 JSON의 요약 동작을 확인했다. 실제 Trivy 실행·다운로드와 GitHub CI는 PR에서 확인해야 한다.
Frontend 빌드 전용 npm 개발 의존성 등 최종 이미지에 없는 의존성은 검사 범위 밖이다.
현재는 이미지 게시 후 검사하므로 취약점 검사를 통과한 이미지의 배포만 허용하는 강제 정책은 아니다.
M5에서 차단 기준·예외 사유·만료일과 GitOps 배포 승인 연결을 추가한다.
