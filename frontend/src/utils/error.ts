import axios from 'axios'
import type { ErrorResponse } from '../types/api'

// 2차의 error.response?.data?.message ?? '기본 문구' 를 타입에 맞게 옮긴 것
export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError<ErrorResponse>(error)) {
    return error.response?.data?.message ?? fallback
  }

  return fallback
}

// Backend 오류 코드 (예: CLOUD_NOT_CONNECTED). 없으면 빈 문자열
export const getErrorCode = (error: unknown): string => {
  if (axios.isAxiosError<ErrorResponse>(error)) {
    return error.response?.data?.code ?? ''
  }

  return ''
}

// 등록된 클라우드 환경이 없거나, 그 API에 필요한 연결(Prometheus·AWS)이 없을 때 (Backend 14.2)
export const CLOUD_NOT_CONNECTED = 'CLOUD_NOT_CONNECTED'
