import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// database/catalog.json 을 저장소 루트 밖(frontend 기준 상위)에서 가져오므로 fs.allow 를 넓힌다
export default defineConfig({
  plugins: [react()],
  server: { fs: { allow: ['..'] } },
  // 의존성 캐시 위치를 바꿔야 할 때(권한 제한 환경 등): VITE_CACHE_DIR=/tmp/vite-cs npm run dev
  cacheDir: process.env.VITE_CACHE_DIR || 'node_modules/.vite',
})
