import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const BASE = '/interior-design-planner/'

export default defineConfig({
  base: BASE,
  server: {
    proxy: {
      '/api/gaisf': {
        target: 'https://moxaingress-gaisf-ingress.azurewebsites.net',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/gaisf/, ''),
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: '室內設計規劃師',
        short_name: '設計規劃',
        description: '從看房到完工的完整室內設計規劃工具',
        theme_color: '#f7f7f8',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: BASE,
        scope: BASE,
        lang: 'zh-TW',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'gfonts', expiration: { maxAgeSeconds: 31536000 } }
          }
        ]
      },
      devOptions: { enabled: false }
    })
  ]
})
