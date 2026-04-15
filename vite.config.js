import { defineConfig } from 'vite'

export default defineConfig({
  base: '/cafepump/',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        admin: 'admin/index.html',
      },
    },
  },
  server: {
    port: 5188,
    strictPort: true,
    host: true,
  }
})
