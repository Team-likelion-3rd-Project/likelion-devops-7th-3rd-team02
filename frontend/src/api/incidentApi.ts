import api from './axios'
import type { ApiResponse } from '../types/api'
import type { Incident } from '../types/incident'

// 설계서 6.9 (확정). Backend 구현 전에는 화면에서 mocks/ 데이터를 쓴다.
export const getIncidents = (projectId: number | string) =>
  api.get<ApiResponse<Incident[]>>(`/projects/${projectId}/incidents`)

// 장애 확인 (OPEN → ACKNOWLEDGED)
export const acknowledgeIncident = (projectId: number | string, incidentId: number | string) =>
  api.patch<ApiResponse<Incident>>(`/projects/${projectId}/incidents/${incidentId}/ack`)

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
