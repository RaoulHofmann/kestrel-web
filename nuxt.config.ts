export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: ['@nuxt/ui', '@nuxt/fonts', '@pinia/nuxt', '@nuxtjs/color-mode', '@nuxt/eslint'],

  css: ['~/assets/css/main.css'],

  // Served from the root of the custom domain (kestrel.raoulhofmann.xyz).
  // NUXT_APP_BASE_URL can override this (e.g. for a /repo/ project site).
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || '/',
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Kestrel',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: 'Kestrel is a browser-based, API-first space cargo and mining company game.'
        },
        { property: 'og:title', content: 'Kestrel' },
        {
          property: 'og:description',
          content: 'An API-first space cargo and mining company game.'
        },
        { name: 'theme-color', content: '#18181b' }
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }]
    }
  },

  ui: {
    fonts: false
  },

  icon: {
    mode: 'svg',
    clientBundle: {
      scan: true,
      icons: [
        'lucide:arrow-right',
        'lucide:arrow-up-right',
        'lucide:ban',
        'lucide:book-open',
        'lucide:coins',
        'lucide:copy',
        'lucide:cpu',
        'lucide:gauge',
        'lucide:key-round',
        'lucide:log-in',
        'lucide:log-out',
        'lucide:mail-check',
        'lucide:menu',
        'lucide:orbit',
        'lucide:pencil',
        'lucide:plug-zap',
        'lucide:radio',
        'lucide:refresh-cw',
        'lucide:rocket',
        'lucide:table-2',
        'lucide:trash-2',
        'lucide:triangle-alert',
        'lucide:x'
      ]
    }
  },

  colorMode: {
    preference: 'dark',
    fallback: 'dark',
    classSuffix: ''
  },

  fonts: {
    families: [
      { name: 'DM Sans', provider: 'google', weights: [400, 500, 700] },
      { name: 'Playfair Display', provider: 'google', weights: [700, 900] }
    ]
  },

  runtimeConfig: {
    public: {
      apiBase: 'https://kestrel-iomeaw.fly.dev'
    }
  },

  routeRules: {
    // Everything that touches the live API is client-only: no SSR fetches.
    '/map': { ssr: false },
    '/world': { ssr: false },
    '/login': { ssr: false },
    '/dashboard': { ssr: false }
  },

  nitro: {
    // Lets `npm run dev` reach the Fly API without CORS: requests to /api/* are
    // proxied server-side. Set NUXT_PUBLIC_API_BASE= (empty) in .env to use it.
    devProxy: {
      '/api': {
        target: 'https://kestrel-iomeaw.fly.dev/api',
        changeOrigin: true
      }
    }
  }
})
