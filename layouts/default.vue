<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 顶部导航 -->
    <nav class="bg-white shadow-sm border-b border-gray-100">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <NuxtLink to="/" class="flex items-center gap-2">
              <span class="text-2xl">🔍</span>
              <span class="font-bold text-xl text-gray-900">舆情星探</span>
              <span class="text-xs text-gray-400">PulseMind</span>
            </NuxtLink>
          </div>
          <div class="flex items-center gap-4">
            <template v-if="auth.user">
              <span class="text-sm text-gray-600">
                {{ auth.user.username }}
                <span
                  :class="[
                    'ml-2 px-2 py-0.5 text-xs rounded-full',
                    auth.user.plan === 'paid' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600',
                  ]"
                >
                  {{ auth.user.plan === 'paid' ? '付费版' : '免费版' }}
                </span>
              </span>
              <button @click="handleLogout" class="text-sm text-gray-500 hover:text-gray-700">
                退出
              </button>
            </template>
            <template v-else>
              <NuxtLink to="/login" class="text-sm text-brand-600 hover:text-brand-700">登录</NuxtLink>
              <NuxtLink to="/register" class="text-sm text-brand-600 hover:text-brand-700">注册</NuxtLink>
            </template>
          </div>
        </div>
      </div>
    </nav>

    <!-- 主要内容 -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <slot />
    </main>

    <!-- 底部 -->
    <footer class="bg-white border-t border-gray-100 mt-auto">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <p class="text-center text-sm text-gray-500">
          © 2026 舆情星探 PulseMind · 智能舆情分析系统
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup>
const auth = useAuth()

const handleLogout = () => {
  auth.logout()
  navigateTo('/login')
}
</script>
