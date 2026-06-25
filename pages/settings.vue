<template>
  <div class="max-w-2xl mx-auto">
    <h1 class="text-2xl font-bold text-gray-900 mb-6">设置</h1>

    <div class="space-y-6">
      <!-- Webhook 配置 -->
      <div class="card">
        <h2 class="text-lg font-semibold mb-4">🔔 Webhook 通知配置</h2>
        <p class="text-sm text-gray-600 mb-4">
          配置飞书或钉钉 Webhook，当舆情预警时会自动发送通知
        </p>

        <form @submit.prevent="saveWebhook" class="space-y-4">
          <div>
            <label class="label">飞书 Webhook URL</label>
            <input
              v-model="webhookForm.feishu"
              type="url"
              class="input"
              placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/xxx"
            />
            <p v-if="user?.webhookConfig?.feishu" class="mt-1 text-xs text-green-600">
              ✅ 已配置
            </p>
          </div>

          <div>
            <label class="label">钉钉 Webhook URL</label>
            <input
              v-model="webhookForm.dingtalk"
              type="url"
              class="input"
              placeholder="https://oapi.dingtalk.com/robot/send?access_token=xxx"
            />
            <p v-if="user?.webhookConfig?.dingtalk" class="mt-1 text-xs text-green-600">
              ✅ 已配置
            </p>
          </div>

          <div class="pt-2">
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? '保存中...' : '保存配置' }}
            </button>
          </div>
        </form>
      </div>

      <!-- 预警说明 -->
      <div class="card">
        <h2 class="text-lg font-semibold mb-4">🚨 预警规则说明</h2>
        <div class="space-y-3">
          <div class="flex items-start gap-3">
            <span class="text-xl">🟢</span>
            <div>
              <div class="font-medium text-green-700">绿色 - 舆情正常</div>
              <div class="text-sm text-gray-600">负面文章占比 &lt; 20%，无需特殊处理</div>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <span class="text-xl">🟡</span>
            <div>
              <div class="font-medium text-yellow-700">黄色 - 舆情预警</div>
              <div class="text-sm text-gray-600">负面文章占比 20% - 50%，建议关注并准备应对预案</div>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <span class="text-xl">🔴</span>
            <div>
              <div class="font-medium text-red-700">红色 - 舆情告警</div>
              <div class="text-sm text-gray-600">负面文章占比 &gt; 50%，需要立即关注和处理</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 订阅信息 -->
      <div class="card">
        <h2 class="text-lg font-semibold mb-4">💳 订阅信息</h2>
        <div class="flex justify-between items-center">
          <div>
            <div class="text-sm text-gray-500">当前方案</div>
            <div class="text-xl font-bold">
              {{ auth.isPaid.value ? '付费版' : '免费版' }}
            </div>
          </div>
          <div v-if="!auth.isPaid.value" class="text-right">
            <div class="text-sm text-gray-500">免费版限制</div>
            <div class="text-sm">· 只能监测 1 个话题</div>
            <div class="text-sm">· 刷新间隔至少 1 小时</div>
          </div>
        </div>
        <p class="mt-4 text-sm text-gray-500">
          升级付费版解锁更多功能：无限话题数量、10分钟级刷新频率、优先技术支持等。
        </p>
      </div>

      <!-- API 配置说明 -->
      <div class="card">
        <h2 class="text-lg font-semibold mb-4">⚙️ 系统配置</h2>
        <div class="text-sm text-gray-600 space-y-2">
          <p>• OpenAI API Key 和 Base URL 通过环境变量配置</p>
          <p>• 详细配置请参考 .env 文件或 Docker 环境变量</p>
          <p>• 默认配置：Base URL = https://api.openai.com/v1</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const auth = useAuth()
const router = useRouter()

const webhookForm = reactive({
  feishu: '',
  dingtalk: '',
})
const saving = ref(false)

const user = computed(() => auth.user.value)

const saveWebhook = async () => {
  saving.value = true
  try {
    await $fetch('/api/settings/webhook', {
      method: 'PUT',
      headers: auth.getAuthHeaders(),
      body: {
        feishu_webhook: webhookForm.feishu || null,
        dingtalk_webhook: webhookForm.dingtalk || null,
      },
    })
    alert('Webhook 配置已保存')
    // 更新用户信息
    auth.initAuth()
  } catch (error) {
    alert(error.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  if (!auth.isLoggedIn.value) {
    router.push('/login')
  }
})

definePageMeta({
  layout: 'default',
})
</script>
