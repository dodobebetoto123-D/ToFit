/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  /** @deprecated 클라이언트에 키를 두지 않는다. VITE_AI_PROXY_URL을 쓸 것 — worker/README.md */
  readonly VITE_GROQ_API_KEY: string
  /** AI(Gemini)를 중계하는 Cloudflare Worker 주소 — 키는 Worker 시크릿에만 있다 */
  readonly VITE_AI_PROXY_URL: string
  readonly VITE_KMA_SERVICE_KEY: string
  readonly VITE_ADFIT_UNIT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
