import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Archivo de configuración de Vite en español
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Actualización automática del Service Worker
      injectRegister: 'auto', // Registro automático
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true, // Forzar actualización inmediata
        clientsClaim: true // Tomar control inmediatamente
      },
      includeAssets: ['icon-192.svg', 'icon-512.svg'],
      manifest: {
        name: 'Portal Meraki',
        short_name: 'Portal Meraki',
        description: 'Portal de monitoreo y diagnóstico de redes Cisco Meraki',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: 'icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      devOptions: {
        enabled: false // Service Worker solo en producción
      }
    })
  ],
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
