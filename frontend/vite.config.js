import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    server: {
      // Dev proxy: routes /api/* → backend at localhost:5001
      // This is ONLY active in `npm run dev` — NOT in production builds
      proxy: {
        '/api': {
          target: 'http://localhost:5001',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      // Generate source maps for easier debugging
      sourcemap: false,
      // Chunk size warnings
      chunkSizeWarningLimit: 1000,
    },
    define: {
      // Make NODE_ENV available in client code
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
  }
})
