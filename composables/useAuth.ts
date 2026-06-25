interface User {
  userId: number
  username: string
  email: string
  plan: string
  expiresAt?: string
  webhookConfig?: {
    feishu: boolean
    dingtalk: boolean
  }
}

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
}

const authState = reactive<AuthState>({
  user: null,
  token: null,
  loading: true,
})

export function useAuth() {
  // 从 localStorage 恢复登录状态
  const initAuth = () => {
    if (import.meta.client) {
      const token = localStorage.getItem('token')
      const user = localStorage.getItem('user')
      if (token && user) {
        authState.token = token
        authState.user = JSON.parse(user)
        // 验证 token 是否有效
        fetchUserInfo()
      } else {
        authState.loading = false
      }
    } else {
      authState.loading = false
    }
  }

  const fetchUserInfo = async () => {
    try {
      const data = await $fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${authState.token}` },
      })
      authState.user = data.data
      if (import.meta.client) {
        localStorage.setItem('user', JSON.stringify(data.data))
      }
    } catch (error) {
      console.error('验证登录状态失败:', error)
      logout()
    } finally {
      authState.loading = false
    }
  }

  const login = async (email: string, password: string) => {
    const data = await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    })

    authState.token = data.data.token
    authState.user = {
      userId: data.data.userId,
      username: data.data.username,
      email: data.data.email,
      plan: data.data.plan,
    }

    if (import.meta.client) {
      localStorage.setItem('token', data.data.token)
      localStorage.setItem('user', JSON.stringify(authState.user))
    }

    return data
  }

  const register = async (username: string, email: string, password: string) => {
    const data = await $fetch('/api/auth/register', {
      method: 'POST',
      body: { username, email, password },
    })

    authState.token = data.data.token
    authState.user = {
      userId: data.data.userId,
      username: data.data.username,
      email: data.data.email,
      plan: data.data.plan,
    }

    if (import.meta.client) {
      localStorage.setItem('token', data.data.token)
      localStorage.setItem('user', JSON.stringify(authState.user))
    }

    return data
  }

  const logout = () => {
    authState.token = null
    authState.user = null
    if (import.meta.client) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  }

  const getAuthHeaders = () => {
    return authState.token ? { Authorization: `Bearer ${authState.token}` } : {}
  }

  return {
    user: computed(() => authState.user),
    token: computed(() => authState.token),
    loading: computed(() => authState.loading),
    isLoggedIn: computed(() => !!authState.token),
    isPaid: computed(() => authState.user?.plan === 'paid'),
    initAuth,
    login,
    register,
    logout,
    getAuthHeaders,
  }
}
