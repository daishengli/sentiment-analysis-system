import OpenAI from 'openai'

let openaiClient: OpenAI | null = null

export function getOpenAIClient(): OpenAI {
  if (openaiClient) return openaiClient

  const config = useRuntimeConfig()
  openaiClient = new OpenAI({
    apiKey: config.openaiApiKey,
    baseURL: config.openaiBaseUrl,
  })

  return openaiClient
}

// 必须显式配置 OPENAI_MODEL
function getModel(): string {
  const config = useRuntimeConfig()
  const configured = (config.openaiModel as string | undefined) || ''
  if (!configured) {
    throw new Error('未配置 OPENAI_MODEL。请在 .env 中设置 OPENAI_MODEL 后重启服务。')
  }
  return configured
}

export interface SentimentResult {
  sentiment: 'positive' | 'neutral' | 'negative'
  score: number // 1-5
  reason: string
}

export async function analyzeSentiment(text: string): Promise<SentimentResult> {
  const client = getOpenAIClient()

  const response = await client.chat.completions.create({
    model: getModel(),
    messages: [
      {
        role: 'system',
        content: `你是一个专业的中文舆情分析助手。请分析以下内容的情感倾向和强度。

要求：
1. 判断情感：positive（正面）、neutral（中性）、negative（负面）
2. 打分 1-5：1=非常负面，2=较负面，3=中性，4=较正面，5=非常正面
3. 给出简短理由

请用 JSON 格式返回：
{
  "sentiment": "positive/neutral/negative",
  "score": 1-5,
  "reason": "简短理由"
}`,
      },
      {
        role: 'user',
        content: text,
      },
    ],
    temperature: 0.3,
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    return { sentiment: 'neutral', score: 3, reason: '分析失败，默认中性' }
  }

  try {
    const result = JSON.parse(content)
    return {
      sentiment: result.sentiment || 'neutral',
      score: Math.min(5, Math.max(1, result.score || 3)),
      reason: result.reason || '',
    }
  } catch {
    return { sentiment: 'neutral', score: 3, reason: '解析失败，默认中性' }
  }
}

export interface ReportSummary {
  summary: string
  topTopics: string[]
  riskLevel: 'green' | 'yellow' | 'red'
  suggestions: string[]
}

export async function generateReportSummary(
  keyword: string,
  articles: Array<{
    title: string
    sentiment: string
    platform: string
  }>,
): Promise<ReportSummary> {
  const client = getOpenAIClient()

  const positiveCount = articles.filter((a) => a.sentiment === 'positive').length
  const negativeCount = articles.filter((a) => a.sentiment === 'negative').length
  const totalCount = articles.length
  const negativeRatio = totalCount > 0 ? negativeCount / totalCount : 0

  let riskLevel: 'green' | 'yellow' | 'red' = 'green'
  if (negativeRatio > 0.5) {
    riskLevel = 'red'
  } else if (negativeRatio > 0.2) {
    riskLevel = 'yellow'
  }

  const response = await client.chat.completions.create({
    model: getModel(),
    messages: [
      {
        role: 'system',
        content: `你是一个专业的中文舆情分析专家。根据以下关于"${keyword}"的舆情数据，生成一份分析报告摘要。

请分析：
1. 给出总体舆情评价（summary）
2. 提取热门话题（topTopics，最多5个）
3. 给出舆情应对建议（suggestions）

数据概览：
- 总文章数：${totalCount}
- 正面：${positiveCount}
- 负面：${negativeCount}
- 中性：${totalCount - positiveCount - negativeCount}
- 负面占比：${(negativeRatio * 100).toFixed(1)}%

请用 JSON 格式返回：
{
  "summary": "总体评价...",
  "topTopics": ["话题1", "话题2", ...],
  "suggestions": ["建议1", "建议2", ...]
}`,
      },
      {
        role: 'user',
        content: `文章列表：\n${articles.map((a) => `[${a.platform}] ${a.title}`).join('\n')}`,
      },
    ],
    temperature: 0.5,
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    return {
      summary: '分析失败',
      topTopics: [],
      riskLevel,
      suggestions: [],
    }
  }

  try {
    const result = JSON.parse(content)
    return {
      summary: result.summary || '暂无分析',
      topTopics: result.topTopics || [],
      riskLevel,
      suggestions: result.suggestions || [],
    }
  } catch {
    return {
      summary: '分析结果解析失败',
      topTopics: [],
      riskLevel,
      suggestions: [],
    }
  }
}
