-- V2: 3차 조회용 인덱스 (ERD 2장 "3차 추가 권장")
-- PostgreSQL은 FK 컬럼에 인덱스를 자동으로 만들지 않는다.
-- 기존 DB에 같은 이름이 있어도 실패하지 않도록 IF NOT EXISTS를 쓴다.

-- 내 프로젝트 목록 (GET /api/projects)
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members (user_id);

-- 업무 목록 정렬 (기본 updatedAt,desc / createdAt,desc)
CREATE INDEX IF NOT EXISTS idx_tasks_project_updated_at ON tasks (project_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_tasks_project_created_at ON tasks (project_id, created_at);

-- 업무 필터와 상태별 건수 (status, assigneeId)
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks (project_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_assignee ON tasks (project_id, assignee_id);
