import axios from 'axios'
import type { ErrorResponse } from '../types/api'

// 2차의 error.response?.data?.message ?? '기본 문구' 를 타입에 맞게 옮긴 것
export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError<ErrorResponse>(error)) {
    return error.response?.data?.message ?? fallback
  }

  return fallback
}
