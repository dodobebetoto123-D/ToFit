import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // 경로 별칭은 이곳에만 정의한다 (tsconfig.app.json의 paths와 항상 동기화할 것)
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
