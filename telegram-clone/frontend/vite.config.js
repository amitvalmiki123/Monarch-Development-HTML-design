import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Backend target: overridable so the dev proxy always reaches the local API server.
const backendTarget = process.env.VITE_BACKEND_URL || 'http://localhost:8081'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'FairyChat',
        short_name: 'FairyChat',
        description: 'A private, real-time messaging app — with your own backend.',
        theme_color: '#151b28',
        background_color: '#151b28',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // FairyChat Premium's "Animated Emojis" pack (public/premium-emoji/,
        // ~56MB across 720 files) must NEVER be part of the app-shell
        // precache — every user's first load would otherwise have to
        // download the whole pack up front, premium or not. It's excluded
        // here and instead only cached on-demand (see runtimeCaching below)
        // the first time each emoji actually gets viewed.
        globIgnores: ['**/premium-emoji/**'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/uploads/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'monarch-uploads',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/premium-emoji/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'fairychat-premium-emoji',
              expiration: { maxEntries: 720, maxAgeSeconds: 60 * 60 * 24 * 365 }
            }
          }
        ]
      }
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': { target: backendTarget, changeOrigin: true },
      '/uploads': { target: backendTarget, changeOrigin: true },
      '/socket.io': { target: backendTarget, changeOrigin: true, ws: true }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true
  }
})
