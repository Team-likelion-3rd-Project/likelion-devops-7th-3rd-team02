import type { UserMe } from '../types/user'

// 로그인 직후 확인한 현재 사용자를 메모리에만 보관해 Layout의 /users/me 중복 호출을 막는다.
// 새로고침하면 비워지므로 Layout이 /users/me로 토큰을 다시 확인한다.
let loggedInUser: UserMe | null = null

export const setLoggedInUser = (user: UserMe | null) => {
  loggedInUser = user
}

export const getLoggedInUser = () => loggedInUser
