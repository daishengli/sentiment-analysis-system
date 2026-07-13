export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  modules: ['@nuxtjs/tailwindcss'],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    jwtSecret: process.env.JWT_SECRET || 'pulsemind-secret-key-change-in-production',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    openaiModel: process.env.OPENAI_MODEL,
    newsApiKey: process.env.NEWSAPI_API_KEY || '',
    dbPath: process.env.DB_PATH || './data/pulsemind.db',
  },

  nitro: {
    storage: {
      db: {
        driver: 'fs',
        base: './data',
      },
    },
    // 使用 Nuxt 内置的定时任务调度
    experimental: {
      tasks: true,
    },
    scheduledTasks: {
      // 每分钟检查一次需要执行的话题
      '* * * * *': ['sentiment-analysis'],
    },
  },

  app: {
    head: {
      title: '舆情星探 PulseMind',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: '智能舆情分析系统' },
      ],
      link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }],
    },
  },

  ssr: true,
})
