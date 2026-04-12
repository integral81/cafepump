import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5188, // 공공화장실(5173)과 완전히 분리된 전용 포트 사용
    strictPort: true,
    host: true, // 외부(아이폰) 접속 허용
  }
})
