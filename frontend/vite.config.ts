import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 10007,
    proxy: {
      '/api': 'http://localhost:8643',
      '/ws': {
        target: 'ws://localhost:8643',
        ws: true,
      },
    },
  },
})
