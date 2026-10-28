import api from './axios'
import type { ApiResponse } from '../types/api'
import type { Incident, IncidentStatus, MyIncidentListResponse } from '../types/incident'

// 설계서 6.9 (확정)
export const getIncidents = (projectId: number | string) =>
  api.get<ApiResponse<Incident[]>>(`/projects/${projectId}/incidents`)

// 장애 확인 (OPEN → ACKNOWLEDGED). 이미 확인된 장애면 200과 현재 장애, 해결된 장애면 409 INVALID_INCIDENT_STATUS
export const acknowledgeIncident = (projectId: number | string, incidentId: number | string) =>
  api.patch<ApiResponse<Incident>>(`/projects/${projectId}/incidents/${incidentId}/ack`)

// 장애 해결 (I6). OPEN·ACKNOWLEDGED 모두 가능, 이미 해결된 장애면 409 INVALID_INCIDENT_STATUS
export const resolveIncident = (projectId: number | string, incidentId: number | string) =>
  api.patch<ApiResponse<Incident>>(`/projects/${projectId}/incidents/${incidentId}/resolve`)

// 담당자 변경. 담당자 값은 팀원의 userId (설계서 6.3)
export const updateIncidentAssignee = (
  projectId: number | string,
  incidentId: number | string,
  assigneeId: number,
) =>
  api.patch<ApiResponse<Incident>>(
    `/projects/${projectId}/incidents/${incidentId}/assignee`,
    { assigneeId },
  )

// 내가 팀원인 모든 프로젝트의 장애 (사이드바 전체 장애 배지, 전체 장애 화면). status는 쉼표로 보낸다.
export const getMyIncidents = (status?: IncidentStatus[]) =>
  api.get<ApiResponse<MyIncidentListResponse>>('/users/me/incidents', {
    params: status ? { status: status.join(',') } : undefined,
  })
