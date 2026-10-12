import api from './axios'
import type { ApiResponse } from '../types/api'
import type { UserMe } from '../types/user'

export const getMe = () => api.get<ApiResponse<UserMe>>('/users/me')
