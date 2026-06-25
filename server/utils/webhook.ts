import axios from 'axios'

export interface AlertPayload {
  keyword: string
  riskLevel: 'green' | 'yellow' | 'red'
  positiveCount: number
  negativeCount: number
  neutralCount: number
  totalCount: number
  negativeRatio: number
  topTopics: string[]
}

function getRiskEmoji(level: 'green' | 'yellow' | 'red'): string {
  switch (level) {
    case 'green':
      return '🟢'
    case 'yellow':
      return '🟡'
    case 'red':
      return '🔴'
  }
}

function getRiskText(level: 'green' | 'yellow' | 'red'): string {
  switch (level) {
    case 'green':
      return '舆情正常'
    case 'yellow':
      return '舆情预警'
    case 'red':
      return '舆情告警'
  }
}

// 发送飞书 Webhook 通知
export async function sendFeishuWebhook(
  webhookUrl: string,
  payload: AlertPayload,
): Promise<boolean> {
  if (!webhookUrl) return false

  try {
    const levelText = getRiskText(payload.riskLevel)
    const emoji = getRiskEmoji(payload.riskLevel)

    const message = {
      msg_type: 'post',
      content: {
        post: {
          zh_cn: {
            title: `${emoji} ${levelText} - 舆情星探`,
            content: [
              [
                {
                  tag: 'text',
                  text: `关键词：${payload.keyword}\n`,
                },
                {
                  tag: 'text',
                  text: `预警级别：${levelText}\n`,
                },
                {
                  tag: 'text',
                  text: `\n📊 舆情概览：\n`,
                },
                {
                  tag: 'text',
                  text: `• 总文章数：${payload.totalCount}\n`,
                },
                {
                  tag: 'text',
                  text: `• 正面：${payload.positiveCount} (${((payload.positiveCount / payload.totalCount) * 100).toFixed(1)}%)\n`,
                },
                {
                  tag: 'text',
                  text: `• 负面：${payload.negativeCount} (${(payload.negativeRatio * 100).toFixed(1)}%)\n`,
                },
                {
                  tag: 'text',
                  text: `• 中性：${payload.neutralCount} (${((payload.neutralCount / payload.totalCount) * 100).toFixed(1)}%)\n`,
                },
              ],
            ],
          },
        },
      },
    }

    await axios.post(webhookUrl, message, { timeout: 5000 })
    return true
  } catch (error) {
    console.error('飞书 Webhook 发送失败:', error)
    return false
  }
}

// 发送钉钉 Webhook 通知
export async function sendDingtalkWebhook(
  webhookUrl: string,
  payload: AlertPayload,
): Promise<boolean> {
  if (!webhookUrl) return false

  try {
    const levelText = getRiskText(payload.riskLevel)
    const emoji = getRiskEmoji(payload.riskLevel)

    const message = {
      msgtype: 'markdown',
      markdown: {
        title: `${levelText} - 舆情星探`,
        text: `## ${emoji} ${levelText} - 舆情星探\n\n**关键词：** ${payload.keyword}\n\n**预警级别：** ${levelText}\n\n---\n\n### 📊 舆情概览\n\n| 类型 | 数量 | 占比 |\n|------|------|------|\n| 总数 | ${payload.totalCount} | 100% |\n| 正面 | ${payload.positiveCount} | ${((payload.positiveCount / payload.totalCount) * 100).toFixed(1)}% |\n| 负面 | ${payload.negativeCount} | ${(payload.negativeRatio * 100).toFixed(1)}% |\n| 中性 | ${payload.neutralCount} | ${((payload.neutralCount / payload.totalCount) * 100).toFixed(1)}% |\n\n${
  payload.topTopics.length > 0
    ? `### 🔥 热门话题\n\n${payload.topTopics.map((t) => `- ${t}`).join('\n')}\n`
    : ''
}`,
      },
    }

    await axios.post(webhookUrl, message, { timeout: 5000 })
    return true
  } catch (error) {
    console.error('钉钉 Webhook 发送失败:', error)
    return false
  }
}

// 发送所有配置的 Webhook
export async function sendAllWebhooks(
  user: { feishu_webhook?: string | null; dingtalk_webhook?: string | null },
  payload: AlertPayload,
): Promise<void> {
  const promises: Promise<boolean>[] = []

  if (user.feishu_webhook) {
    promises.push(sendFeishuWebhook(user.feishu_webhook, payload))
  }

  if (user.dingtalk_webhook) {
    promises.push(sendDingtalkWebhook(user.dingtalk_webhook, payload))
  }

  await Promise.allSettled(promises)
}
