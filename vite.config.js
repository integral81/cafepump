import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/cafepump/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin/index.html'),
      },
    },
  },
  server: {
    port: 5188,
    strictPort: true,
    host: true,
  }
})
