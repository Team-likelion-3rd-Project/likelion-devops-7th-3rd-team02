import api from './axios'
import type { ApiResponse } from '../types/api'
import type {
  LoginRequest,
  LoginResponse,
  SignupRequest,
  SignupResponse,
} from '../types/auth'

// 회원가입
export const signup = (data: SignupRequest) =>
  api.post<ApiResponse<SignupResponse>>('/auth/signup', data)

// 로그인
export const login = (data: LoginRequest) =>
  api.post<ApiResponse<LoginResponse>>('/auth/login', data)
