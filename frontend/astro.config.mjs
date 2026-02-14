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
        name: 'BoomerBill',
        short_name: 'BoomerBill',
        start_url: '/app',
        scope: '/',
        display: 'standalone',
        background_color: '#111111',
        theme_color: '#111111',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})
