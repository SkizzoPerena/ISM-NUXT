// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: {
    enabled: true,

    timeline: {
      enabled: true
    },
  },
  debug: true,
  modules: ['@nuxt/ui', '@nuxt/icon', '@nuxt/fonts', '@nuxt/image'],
  css: ['~/assets/css/main.css'],
    ui: {
  },
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
  },
  image: {
    domains: ['ism-noteworthy.s3.amazonaws.com', 'placehold.co'],
  },
})