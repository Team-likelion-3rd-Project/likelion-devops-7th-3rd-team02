# DevFlow Backend

DevFlow 프로젝트의 Backend 애플리케이션입니다.

## Tech Stack

- Java 21
- Spring Boot 3.5.4
- Gradle
- Spring Data JPA
- Spring Security
- JWT
- PostgreSQL 17
- Docker / Docker Compose
- Swagger / OpenAPI
- Spring Boot Actuator
- Micrometer Prometheus

---

## Local Development

로컬 개발 환경에서는 별도의 PostgreSQL 설치 없이 Docker Compose를 사용합니다.

### 1. PostgreSQL 실행

`backend` 디렉터리에서 실행합니다.

```bash
docker compose up -d
```

실행 상태 확인:

```bash
docker compose ps
```

정상 실행 시 PostgreSQL 컨테이너:

```text
devflow-postgres
```

기본 DB 정보:

```text
Database: devflow
User: devflow
Port: 5432
```

---

## Local Database

Docker Compose에서 PostgreSQL 17을 실행합니다.

```yaml
services:
  postgres:
    image: postgres:17
    container_name: devflow-postgres
```

로컬에서 Spring Boot를 직접 실행하는 경우 JDBC URL:

```text
jdbc:postgresql://localhost:5432/devflow
```

Backend도 Docker Container로 실행하고 PostgreSQL과 동일한 Docker Network를 사용하는 경우:

```text
jdbc:postgresql://devflow-postgres:5432/devflow
```

를 사용합니다.

---

## JPA DDL 설정

로컬 프로필에서는 다음 설정을 사용합니다.

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: update
```

따라서 로컬 PostgreSQL DB가 비어 있어도 Spring Boot 실행 시 Entity를 기준으로 필요한 테이블이 자동 생성됩니다.

현재 주요 테이블:

```text
users
projects
project_members
tasks
```

만약 실행 시 다음과 같은 오류가 발생한다면:

```text
Schema-validation: missing table [project_members]
```

현재 활성 Profile을 확인해야 합니다.

로컬에서는 기본적으로:

```text
SPRING_PROFILES_ACTIVE=local
```

이 적용되어야 합니다.

Spring Boot 실행 로그에서 다음과 같은 내용을 확인할 수 있습니다.

```text
The following 1 profile is active: "local"
```

`validate`가 적용되고 있다면 `local` Profile이 아닌 다른 Profile 또는 환경변수 설정이 적용되고 있는지 확인합니다.

---

## Environment Variables

Backend는 다음 환경변수를 사용할 수 있습니다.

```env
SPRING_PROFILES_ACTIVE=local

DB_URL=jdbc:postgresql://localhost:5432/devflow
DB_USERNAME=devflow
DB_PASSWORD=devflow-local-password

JWT_SECRET=your-local-jwt-secret
JWT_EXPIRATION=3600000

SERVER_PORT=8080
```

환경변수를 별도로 지정하지 않을 경우 로컬 개발용 기본값이 사용됩니다.

실제 운영 환경에서는 DB Password와 JWT Secret을 소스코드 또는 Repository에 직접 저장하지 않고 별도의 Secret 관리 방식을 사용합니다.

---

## Backend 실행

먼저 PostgreSQL Container가 실행 중인지 확인합니다.

```bash
docker compose ps
```

그다음 Backend를 실행합니다.

```bash
./gradlew bootRun
```

정상 실행 시 Backend는 다음 주소에서 동작합니다.

```text
http://localhost:8080
```

---

## Build

Backend Build:

```bash
./gradlew clean build
```

정상적인 경우:

```text
BUILD SUCCESSFUL
```

이 출력됩니다.

---

## Swagger

Backend 실행 후 다음 주소에서 Swagger UI를 사용할 수 있습니다.

```text
http://localhost:8080/swagger-ui.html
```

로그인 API를 통해 발급받은 JWT Access Token을 Swagger의 `Authorize`에 등록하면 보호된 API를 테스트할 수 있습니다.

---

## Main API

### Auth

```http
POST /api/auth/signup
POST /api/auth/login
GET  /api/users/me
```

### Project

```http
POST /api/projects
GET  /api/projects
GET  /api/projects/{projectId}
```

### Project Member

```http
POST /api/projects/{projectId}/members
GET  /api/projects/{projectId}/members
```

### Task

```http
POST  /api/projects/{projectId}/tasks
GET   /api/projects/{projectId}/tasks
GET   /api/projects/{projectId}/tasks/{taskId}
PATCH /api/projects/{projectId}/tasks/{taskId}/assignee
PATCH /api/projects/{projectId}/tasks/{taskId}/status
```

---

## Authentication

로그인 성공 시 JWT Access Token이 발급됩니다.

보호된 API 요청 시 다음 Header를 사용합니다.

```http
Authorization: Bearer {accessToken}
```

JWT에는 사용자 ID와 이메일 정보가 포함되며, Backend에서는 인증된 사용자 정보를 기준으로 API 접근 권한을 검증합니다.

---

## Project 권한

프로젝트 생성자는 자동으로 `OWNER` 역할의 ProjectMember로 등록됩니다.

프로젝트 역할:

```text
OWNER
MEMBER
```

권한 예시:

```text
OWNER
- 프로젝트 조회
- 프로젝트 팀원 조회
- 프로젝트 팀원 등록
- Task 생성/조회/수정

MEMBER
- 참여 프로젝트 조회
- 프로젝트 팀원 조회
- Task 생성/조회/상태 변경

OUTSIDER
- 프로젝트 접근 불가
```

---

## Task Status

Task 상태는 다음과 같이 관리합니다.

```text
TODO
IN_PROGRESS
DONE
```

Task 생성 시 기본 상태는:

```text
TODO
```

입니다.

Task 담당자는 해당 프로젝트에 참여 중인 사용자만 지정할 수 있습니다.

---

## Monitoring

Spring Boot Actuator 및 Micrometer Prometheus를 사용합니다.

### Health Check

```http
GET /actuator/health
```

### Liveness

```http
GET /actuator/health/liveness
```

### Readiness

```http
GET /actuator/health/readiness
```

### Prometheus Metrics

```http
GET /actuator/prometheus
```

Prometheus Endpoint에서는 다음과 같은 Metrics를 확인할 수 있습니다.

```text
JVM Memory
JVM Thread
HTTP Request
HTTP Response Time
HikariCP Connection Pool
Process CPU
System CPU
Spring Security
Spring Data Repository
```

애플리케이션 공통 태그:

```text
application="devflow-backend"
```

---

## Kubernetes 연동 정보

Backend Container Port:

```text
8080
```

Liveness Probe:

```text
/actuator/health/liveness
```

Readiness Probe:

```text
/actuator/health/readiness
```

Health Check:

```text
/actuator/health
```

Prometheus Scrape Endpoint:

```text
/actuator/prometheus
```

Kubernetes / CI/CD 환경에서 필요한 주요 환경변수:

```text
SPRING_PROFILES_ACTIVE
DB_URL
DB_USERNAME
DB_PASSWORD
JWT_SECRET
JWT_EXPIRATION
SERVER_PORT
```

---

## Docker

Backend Docker Image Build:

```bash
docker build -t devflow-backend:local .
```

로컬 Docker PostgreSQL Network 확인:

```bash
docker network ls
```

Backend Container를 PostgreSQL과 동일한 Docker Network에서 실행하는 경우 DB URL은:

```text
jdbc:postgresql://devflow-postgres:5432/devflow
```

을 사용합니다.

주의:

```text
localhost
```

는 Container 내부에서는 해당 Container 자신을 의미합니다.

따라서 Backend Container에서 PostgreSQL Container로 연결할 때는 `localhost`가 아닌 PostgreSQL Container 이름을 사용해야 합니다.

---

## Postman Integration Test

Postman Collection을 이용하여 Backend MVP 전체 API 통합 테스트를 수행할 수 있습니다.

테스트 범위:

```text
Auth
JWT Authentication
Project
ProjectMember
Task
Authentication / Authorization
Exception
Actuator
Prometheus
```

Postman Collection에서는 Collection Variable을 활용하여 다음 값을 자동으로 전달합니다.

```text
ownerToken
memberToken
outsiderToken

ownerId
memberId
outsiderId

projectId
taskId
```

전체 테스트 흐름:

```text
회원가입
→ 로그인
→ JWT 저장
→ 내 정보 조회
→ 프로젝트 생성
→ Project ID 저장
→ 프로젝트 멤버 등록
→ Task 생성
→ Task ID 저장
→ 담당자 지정
→ TODO → IN_PROGRESS
→ IN_PROGRESS → DONE
→ 인증/권한/예외 테스트
→ Monitoring 테스트
```

Local 환경 Collection Runner 기준:

```text
70 Tests
70 Passed
0 Failed
0 Errors
```

---

## PostgreSQL 직접 접속

PostgreSQL Container에 직접 접속:

```bash
docker exec -it devflow-postgres psql -U devflow -d devflow
```

현재 테이블 확인:

```sql
\dt
```

각 테이블 구조 확인:

```sql
\d users
\d projects
\d project_members
\d tasks
```

데이터 확인:

```sql
SELECT * FROM users;
SELECT * FROM projects;
SELECT * FROM project_members;
SELECT * FROM tasks;
```

종료:

```sql
\q
```

---

## 테스트 DB 초기화

Postman 통합 테스트 등을 위해 로컬 테스트 데이터를 초기화하려면:

```bash
docker exec -it devflow-postgres \
psql -U devflow -d devflow \
-c "TRUNCATE TABLE tasks, project_members, projects, users RESTART IDENTITY CASCADE;"
```

초기화 후 ID는 다시 1부터 시작합니다.

주의:

이 명령은 로컬 테스트 환경에서만 사용합니다.

---

## Troubleshooting

### 1. PostgreSQL 연결 오류

Docker Container 상태 확인:

```bash
docker compose ps
```

PostgreSQL 직접 접속:

```bash
docker exec -it devflow-postgres psql -U devflow -d devflow
```

정상적으로 접속된다면 PostgreSQL Container는 정상 동작 중입니다.

---

### 2. `project_members` 등의 테이블이 없는 경우

로컬 Profile에서는:

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: update
```

를 사용합니다.

따라서 Backend 실행 시 테이블이 자동 생성되어야 합니다.

실행 로그에서 다음을 확인합니다.

```text
The following 1 profile is active: "local"
```

만약 `ddl-auto: validate`로 실행되고 있다면 현재 활성 Profile 또는 환경변수를 확인합니다.

```text
SPRING_PROFILES_ACTIVE=local
```

---

### 3. Docker Backend에서 DB 연결 실패

Backend를 로컬 JVM에서 실행할 경우:

```text
jdbc:postgresql://localhost:5432/devflow
```

Backend를 Docker Container로 실행할 경우:

```text
jdbc:postgresql://devflow-postgres:5432/devflow
```

을 사용합니다.

---

### 4. Docker Daemon 연결 오류

다음과 같은 오류가 발생할 경우:

```text
Cannot connect to the Docker daemon
```

Docker Desktop이 실행 중인지 확인합니다.

확인:

```bash
docker info
```

Server 정보가 출력되면 Docker Daemon이 정상 실행 중입니다.

---

### 5. Backend 실행 확인

```bash
curl http://localhost:8080/actuator/health
```

정상:

```json
{
  "status": "UP"
}
```

---

## Development Notes

- Backend 개발 기준 Java 버전은 Java 21입니다.
- CI/CD 환경의 Java 버전도 Java 21 기준으로 통일할 예정입니다.
- 로컬 DB는 Docker PostgreSQL 17을 사용합니다.
- 실제 운영 DB Credential은 별도 Secret 관리 방식을 적용할 예정입니다.
- Terraform State에 DB Password가 노출되지 않도록 Infra 설정 개선을 진행할 예정입니다.
- Postman Collection을 CI/CD Pipeline에서 자동 실행하는 방식도 추후 검토합니다.