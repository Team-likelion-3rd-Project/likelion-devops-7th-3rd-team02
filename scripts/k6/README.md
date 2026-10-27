# k6 부하 테스트

Wiki [성능-테스트](https://github.com/Team-likelion-3rd-Project/likelion-devops-7th-3rd-team02/wiki/성능-테스트)에 목표·시나리오·결과를 기록합니다.

```bash
# 프로필: smoke(기본) | load | spike | hpa
k6 run -e BASE_URL=https://<도메인> -e PROFILE=load --summary-export load-summary.json scripts/k6/devflow-load.js

# Docker로 (k6 설치 없이)
docker run --rm -i --network host -v "$PWD/scripts/k6:/s" grafana/k6:0.54.0 \
  run -e BASE_URL=http://localhost:3000 -e PROFILE=smoke /s/devflow-load.js
```

- 기본은 테스트용 계정·프로젝트·업무 20개를 새로 만듭니다. 기존 프로젝트로 돌리려면 `EMAIL`, `PASSWORD`, `PROJECT_ID`를 환경 변수로 넘깁니다 (비밀번호를 명령줄에 직접 쓰지 않기).
- 클라우드가 연결된 프로젝트에서 운영 화면 API까지 부하를 주려면 `-e OPS=1`.
- `hpa` 프로필은 로그인(BCrypt)을 반복해 Backend CPU를 올립니다. 실행 중 `kubectl get hpa -n devflow -w` 또는 DevFlow 모니터링 > 인프라 > HPA에서 레플리카 증가를 확인합니다.
- 운영(AWS) 대상 실행은 팀에 공지한 뒤 진행합니다.
