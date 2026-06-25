<template>
  <div>
    <!-- Hero Section -->
    <div class="text-center mb-12">
      <h1 class="text-4xl font-bold text-gray-900 mb-4">
        🔍 舆情星探 PulseMind
      </h1>
      <p class="text-xl text-gray-600 max-w-2xl mx-auto">
        智能化舆情监测与分析平台，输入关键词，自动采集全网信息，AI 智能分析情感，实时预警风险
      </p>
    </div>

    <!-- Features -->
    <div class="grid md:grid-cols-3 gap-6 mb-12">
      <div class="card text-center">
        <div class="text-4xl mb-4">📊</div>
        <h3 class="text-lg font-semibold mb-2">全网覆盖</h3>
        <p class="text-gray-600 text-sm">微博、知乎、抖音、小红书、百家号、新闻网站...除微信公众号外全覆盖</p>
      </div>
      <div class="card text-center">
        <div class="text-4xl mb-4">🤖</div>
        <h3 class="text-lg font-semibold mb-2">AI 智能分析</h3>
        <p class="text-gray-600 text-sm">基于大语言模型，自动判断情感倾向，提取热门话题，生成专业报告</p>
      </div>
      <div class="card text-center">
        <div class="text-4xl mb-4">🚨</div>
        <h3 class="text-lg font-semibold mb-2">实时预警</h3>
        <p class="text-gray-600 text-sm">三色预警系统，负面舆情超标自动推送飞书/钉钉通知</p>
      </div>
    </div>

    <!-- CTA -->
    <div class="text-center">
      <template v-if="auth.isLoggedIn.value">
        <NuxtLink to="/dashboard" class="btn btn-primary text-lg px-8 py-3">
          进入控制台 →
        </NuxtLink>
      </template>
      <template v-else>
        <div class="flex justify-center gap-4">
          <NuxtLink to="/register" class="btn btn-primary text-lg px-8 py-3">
            立即开始免费使用
          </NuxtLink>
          <NuxtLink to="/login" class="btn btn-secondary text-lg px-8 py-3">
            已有账号登录
          </NuxtLink>
        </div>
        <p class="mt-4 text-sm text-gray-500">免费版可监测 1 个话题，刷新间隔 1 小时</p>
      </template>
    </div>
  </div>
</template>

<script setup>
const auth = useAuth()

definePageMeta({
  layout: 'default',
})
</script>
