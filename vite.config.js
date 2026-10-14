import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The proxy lets the live Bicing layer work in `npm run dev`
// even if the bike-share API does not send CORS headers.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api/citybikes': {
        target: 'https://api.citybik.es',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/citybikes/, ''),
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 4000,
  },
})
