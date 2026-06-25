<template>
  <div class="max-w-md mx-auto">
    <div class="card">
      <h2 class="text-2xl font-bold text-center mb-6">注册舆情星探</h2>

      <form @submit.prevent="handleRegister" class="space-y-4">
        <div>
          <label class="label">用户名</label>
          <input
            v-model="form.username"
            type="text"
            class="input"
            placeholder="输入用户名"
            required
          />
        </div>

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
            placeholder="至少6位"
            required
          />
        </div>

        <div>
          <label class="label">确认密码</label>
          <input
            v-model="form.confirmPassword"
            type="password"
            class="input"
            placeholder="再次输入密码"
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
          {{ loading ? '注册中...' : '注册' }}
        </button>
      </form>

      <p class="mt-4 text-center text-sm text-gray-600">
        已有账号？
        <NuxtLink to="/login" class="text-brand-600 hover:text-brand-700">
          立即登录
        </NuxtLink>
      </p>
    </div>
  </div>
</template>

<script setup>
const auth = useAuth()
const router = useRouter()

const form = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
})
const loading = ref(false)
const error = ref('')

const handleRegister = async () => {
  if (form.password !== form.confirmPassword) {
    error.value = '两次输入的密码不一致'
    return
  }

  if (form.password.length < 6) {
    error.value = '密码长度不能少于6位'
    return
  }

  loading.value = true
  error.value = ''

  try {
    await auth.register(form.username, form.email, form.password)
    router.push('/dashboard')
  } catch (e) {
    error.value = e.data?.message || '注册失败'
  } finally {
    loading.value = false
  }
}

definePageMeta({
  layout: 'default',
})
</script>
