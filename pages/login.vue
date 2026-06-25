<template>
  <div class="max-w-md mx-auto">
    <div class="card">
      <h2 class="text-2xl font-bold text-center mb-6">登录舆情星探</h2>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div>
          <label class="label">邮箱</label>
          <input
            v-model="form.email"
            type="email"
            class="input"
            placeholder="your@email.com"
            required
          />
        </div>

        <div>
          <label class="label">密码</label>
          <input
            v-model="form.password"
            type="password"
            class="input"
            placeholder="••••••••"
            required
          />
        </div>

        <div v-if="error" class="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {{ error }}
        </div>

        <button
          type="submit"
          class="btn btn-primary w-full"
          :disabled="loading"
        >
          <span v-if="loading" class="spinner w-5 h-5 mr-2"></span>
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>

      <p class="mt-4 text-center text-sm text-gray-600">
        还没有账号？
        <NuxtLink to="/register" class="text-brand-600 hover:text-brand-700">
          立即注册
        </NuxtLink>
      </p>
    </div>
  </div>
</template>

<script setup>
const auth = useAuth()
const router = useRouter()

const form = reactive({
  email: '',
  password: '',
})
const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  loading.value = true
  error.value = ''

  try {
    await auth.login(form.email, form.password)
    router.push('/dashboard')
  } catch (e) {
    error.value = e.data?.message || '登录失败'
  } finally {
    loading.value = false
  }
}

// 如果已登录，直接跳转
onMounted(() => {
  if (auth.isLoggedIn.value) {
    router.push('/dashboard')
  }
})

definePageMeta({
  layout: 'default',
})
</script>
