import { defineConfig } from 'astro/config'
import vue from '@astrojs/vue'
import pwa from '@vite-pwa/astro'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    vue(),
    pwa({
      registerType: 'autoUpdate',
      manifest: {
        id: '/app',
        name: 'BoomerBill',
        short_name: 'BoomerBill',
        description: 'Track unpaid tech support sessions, sync devices, and join the community feed.',
        start_url: '/app/',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui', 'browser'],
        orientation: 'portrait',
        background_color: '#111111',
        theme_color: '#111111',
        categories: ['productivity', 'utilities', 'business'],
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
})
