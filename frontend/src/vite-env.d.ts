/// <reference types="vite/client" />

interface ImportMetaEnv {
  // 지정하지 않으면 /api 를 사용한다 (src/api/axios.ts)
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
