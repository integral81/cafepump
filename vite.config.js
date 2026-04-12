import { defineConfig } from 'vite'

export default defineConfig({
  base: '/cafepump/',
  server: {
    port: 5188,
    strictPort: true,
    host: true,
  }
})
