import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
// 로컬 브라우저에서 토스 네이티브 기능(결제·광고 등)을 흉내내 준다.
import { vite as aitDevtools } from '@apps-in-toss/devtools/unplugin'

export default defineConfig({
  plugins: [react(), aitDevtools()],
})
