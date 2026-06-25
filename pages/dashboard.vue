<template>
  <div>
    <!-- 页面标题 -->
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900">舆情监测</h1>
      <button @click="showAddModal = true" class="btn btn-primary">
        + 添加话题
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="spinner w-8 h-8"></div>
    </div>

    <!-- 话题列表 -->
    <div v-else-if="topics.length > 0" class="space-y-4">
      <div v-for="topic in topics" :key="topic.id" class="card">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="text-lg font-semibold text-gray-900 flex items-center gap-2">
              {{ topic.keyword }}
              <span
                :class="[
                  'px-2 py-0.5 text-xs rounded-full',
                  topic.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
                ]"
              >
                {{ topic.status === 'active' ? '监测中' : '已暂停' }}
              </span>
            </h3>
            <div class="mt-1 text-sm text-gray-500">
              <span>刷新频率: {{ topic.refreshInterval }}分钟</span>
              <span class="mx-2">·</span>
              <span>文章数: {{ topic.articleCount }}</span>
              <span class="mx-2">·</span>
              <span>报告数: {{ topic.reportCount }}</span>
            </div>
            <div class="mt-1 text-xs text-gray-400">
              创建于: {{ formatDate(topic.createdAt) }}
              <template v-if="topic.lastReportAt">
                · 最近分析: {{ formatDate(topic.lastReportAt) }}
              </template>
            </div>
          </div>

          <div class="flex gap-2">
            <button
              @click="runAnalysis(topic)"
              class="btn btn-primary text-sm px-3 py-1.5"
              :disabled="runningTask === topic.id"
            >
              {{ runningTask === topic.id ? '分析中...' : '立即分析' }}
            </button>
            <button
              @click="viewReports(topic)"
              class="btn btn-secondary text-sm px-3 py-1.5"
            >
              报告
            </button>
            <button
              @click="editTopic(topic)"
              class="btn btn-secondary text-sm px-3 py-1.5"
            >
              编辑
            </button>
            <button
              @click="deleteTopic(topic)"
              class="btn btn-danger text-sm px-3 py-1.5"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="text-center py-12">
      <div class="text-6xl mb-4">📊</div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">还没有监测话题</h3>
      <p class="text-gray-500 mb-4">添加第一个话题，开始舆情监测之旅</p>
      <button @click="showAddModal = true" class="btn btn-primary">
        + 添加话题
      </button>
    </div>

    <!-- 添加/编辑话题弹窗 -->
    <div v-if="showAddModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 class="text-xl font-bold mb-4">{{ editingTopic ? '编辑话题' : '添加话题' }}</h3>

        <form @submit.prevent="saveTopic" class="space-y-4">
          <div>
            <label class="label">监测关键词 *</label>
            <input
              v-model="topicForm.keyword"
              type="text"
              class="input"
              placeholder="例如：北京大学"
              required
            />
          </div>

          <div>
            <label class="label">
              刷新频率
              <span v-if="!auth.isPaid.value" class="text-xs text-gray-400">(付费用户可设置10分钟起)</span>
            </label>
            <select v-model="topicForm.refreshInterval" class="input">
              <option :value="10">10 分钟</option>
              <option :value="30">30 分钟</option>
              <option :value="60">1 小时</option>
              <option :value="120">2 小时</option>
              <option :value="360">6 小时</option>
              <option :value="720">12 小时</option>
              <option :value="1440">24 小时</option>
            </select>
          </div>

          <div v-if="editingTopic">
            <label class="label">状态</label>
            <select v-model="topicForm.status" class="input">
              <option value="active">监测中</option>
              <option value="paused">已暂停</option>
            </select>
          </div>

          <div class="flex gap-3 pt-2">
            <button type="button" @click="closeModal" class="btn btn-secondary flex-1">
              取消
            </button>
            <button type="submit" class="btn btn-primary flex-1" :disabled="saving">
              {{ saving ? '保存中...' : '保存' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 报告列表弹窗 -->
    <div v-if="showReportModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[80vh] overflow-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold">{{ selectedTopic?.keyword }} - 报告列表</h3>
          <button @click="showReportModal = false" class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
        </div>

        <div v-if="reports.length > 0" class="space-y-3">
          <div v-for="report in reports" :key="report.id" class="border rounded-lg p-4">
            <div class="flex justify-between items-start">
              <div>
                <div class="flex items-center gap-2">
                  <span
                    :class="[
                      'px-2 py-0.5 text-xs rounded-full',
                      report.riskLevel === 'green' ? 'bg-green-100 text-green-700' :
                      report.riskLevel === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700',
                    ]"
                  >
                    {{ report.riskLevel === 'green' ? '🟢 正常' : report.riskLevel === 'yellow' ? '🟡 预警' : '🔴 告警' }}
                  </span>
                  <span class="text-sm text-gray-500">{{ formatDate(report.createdAt) }}</span>
                </div>
                <p class="mt-2 text-sm text-gray-700 line-clamp-2">{{ report.summary }}</p>
                <div class="mt-2 text-xs text-gray-500">
                  正面: {{ report.sentimentDist.positive || 0 }} /
                  负面: {{ report.sentimentDist.negative || 0 }} /
                  中性: {{ report.sentimentDist.neutral || 0 }}
                </div>
              </div>
              <div class="flex gap-2">
                <a
                  :href="`/api/reports/${report.id}/download`"
                  class="btn btn-primary text-sm px-3 py-1.5"
                  download
                >
                  下载报告
                </a>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-8 text-gray-500">
          暂无报告，请先运行一次分析
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const auth = useAuth()
const router = useRouter()

const loading = ref(true)
const topics = ref([])
const showAddModal = ref(false)
const showReportModal = ref(false)
const editingTopic = ref(null)
const selectedTopic = ref(null)
const reports = ref([])
const runningTask = ref(null)
const saving = ref(false)

const topicForm = reactive({
  keyword: '',
  refreshInterval: 60,
  status: 'active',
})

const fetchTopics = async () => {
  try {
    const data = await $fetch('/api/topics', {
      headers: auth.getAuthHeaders(),
    })
    topics.value = data.data.topics
  } catch (error) {
    console.error('获取话题列表失败:', error)
  } finally {
    loading.value = false
  }
}

const saveTopic = async () => {
  saving.value = true
  try {
    if (editingTopic.value) {
      await $fetch(`/api/topics/${editingTopic.value.id}`, {
        method: 'PUT',
        headers: auth.getAuthHeaders(),
        body: topicForm,
      })
    } else {
      await $fetch('/api/topics', {
        method: 'POST',
        headers: auth.getAuthHeaders(),
        body: topicForm,
      })
    }
    closeModal()
    fetchTopics()
  } catch (error) {
    alert(error.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const runAnalysis = async (topic) => {
  runningTask.value = topic.id
  try {
    await $fetch(`/api/topics/${topic.id}/run`, {
      method: 'POST',
      headers: auth.getAuthHeaders(),
    })
    alert('分析任务已启动，请稍后查看报告')
    fetchTopics()
  } catch (error) {
    alert(error.data?.message || '启动分析失败')
  } finally {
    runningTask.value = null
  }
}

const viewReports = async (topic) => {
  selectedTopic.value = topic
  showReportModal.value = true
  try {
    const data = await $fetch(`/api/topics/${topic.id}/reports`, {
      headers: auth.getAuthHeaders(),
    })
    reports.value = data.data.reports
  } catch (error) {
    console.error('获取报告列表失败:', error)
    reports.value = []
  }
}

const editTopic = (topic) => {
  editingTopic.value = topic
  topicForm.keyword = topic.keyword
  topicForm.refreshInterval = topic.refreshInterval
  topicForm.status = topic.status
  showAddModal.value = true
}

const deleteTopic = async (topic) => {
  if (!confirm(`确定要删除话题"${topic.keyword}"吗？相关数据和报告也会被删除。`)) return

  try {
    await $fetch(`/api/topics/${topic.id}`, {
      method: 'DELETE',
      headers: auth.getAuthHeaders(),
    })
    fetchTopics()
  } catch (error) {
    alert(error.data?.message || '删除失败')
  }
}

const closeModal = () => {
  showAddModal.value = false
  editingTopic.value = null
  topicForm.keyword = ''
  topicForm.refreshInterval = auth.isPaid.value ? 30 : 60
  topicForm.status = 'active'
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

// 页面加载时检查登录状态
onMounted(async () => {
  if (!auth.isLoggedIn.value) {
    router.push('/login')
    return
  }
  // 如果是免费用户，设置默认刷新间隔为60分钟
  if (!auth.isPaid.value) {
    topicForm.refreshInterval = 60
  }
  await fetchTopics()
})

definePageMeta({
  layout: 'default',
})
</script>
