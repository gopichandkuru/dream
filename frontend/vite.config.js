import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'keep-stdin-open',
        configureServer() {
          process.stdin.resume();
        },
      },
      // Ensure _redirects is always in dist for Render SPA routing
      {
        name: 'copy-redirects',
        closeBundle() {
          const redirectsContent = '/*    /index.html   200\n'
          const outDir = path.resolve(__dirname, 'dist')
          if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
          fs.writeFileSync(path.resolve(outDir, '_redirects'), redirectsContent)
          console.log('✅ _redirects written to dist/')
        },
      },
    ],
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
