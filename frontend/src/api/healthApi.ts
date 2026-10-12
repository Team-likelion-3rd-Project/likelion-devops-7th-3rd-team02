import axios from 'axios'
import type { HealthResponse } from '../types/health'

// /actuator/health 는 /api 밖이므로 공통 인스턴스를 쓰지 않는다.
export const getHealth = () => axios.get<HealthResponse>('/actuator/health')
