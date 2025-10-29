import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Archivo de configuración de Vite en español
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',  // Escuchar en todas las interfaces
    open: false,
    allowedHosts: [
      '.ngrok-free.dev',
      '.ngrok.io',
      'localhost'
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000
  },
  preview: {
    port: 5173,
    host: '0.0.0.0'
  }
})
