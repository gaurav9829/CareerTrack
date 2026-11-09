import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev: the browser always talks to same-origin /api and Vite forwards to Express.
// Prod: vercel.json rewrites /api/* to the Render backend, so the same
// "one origin" rule keeps the auth cookie first-party everywhere.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
