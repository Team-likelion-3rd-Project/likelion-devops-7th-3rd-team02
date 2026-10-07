// Backend 공통 응답 (global/response/ApiResponse, ErrorResponse)
export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

export interface ErrorResponse {
  success: boolean
  message: string
  code: string
  data: unknown
}
