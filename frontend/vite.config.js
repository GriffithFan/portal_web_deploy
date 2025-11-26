import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.meraki\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'meraki-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60
              },
              networkTimeoutSeconds: 10
            }
          },
          {
            urlPattern: /^https:\/\/portalmeraki\.info\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'backend-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 5 * 60
              },
              networkTimeoutSeconds: 10
            }
          }
        ]
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
        scope: '/',
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
        enabled: false
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
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          icons: ['lucide-react']
        }
      }
    }
  },
  preview: {
    port: 5173,
    host: '0.0.0.0'
  }
})
