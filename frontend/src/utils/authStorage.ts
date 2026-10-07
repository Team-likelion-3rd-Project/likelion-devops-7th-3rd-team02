const ACCESS_TOKEN_KEY = 'accessToken'
const TOKEN_TYPE_KEY = 'tokenType'

export const getAccessToken = (): string | null => {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY)
}

export const setAccessToken = (accessToken: string | null | undefined) => {
  if (!accessToken) {
    return
  }

  sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
}

export const removeAccessToken = () => {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
}

export const getTokenType = (): string => {
  return sessionStorage.getItem(TOKEN_TYPE_KEY) || 'Bearer'
}

export const setTokenType = (tokenType: string | null | undefined) => {
  sessionStorage.setItem(TOKEN_TYPE_KEY, tokenType || 'Bearer')
}

export const removeTokenType = () => {
  sessionStorage.removeItem(TOKEN_TYPE_KEY)
}

export const clearAuthStorage = () => {
  removeAccessToken()
  removeTokenType()
}
