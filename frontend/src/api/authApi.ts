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

// 소셜 로그인 1회용 code 교환 (X3). 응답은 이메일 로그인과 같다. 만료·재사용이면 400 INVALID_OAUTH_CODE
export const exchangeOAuthCode = (code: string) =>
  api.post<ApiResponse<LoginResponse>>('/auth/oauth/token', { code })
