import { defineConfig } from 'astro/config'
import vue from '@astrojs/vue'
import { VitePWA } from '@vite-pwa/astro'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'BoomerBill',
        short_name: 'BoomerBill',
        start_url: '/app',
        display: 'standalone',
        background_color: '#111111',
        theme_color: '#111111'
      }
    })
  ]
})

