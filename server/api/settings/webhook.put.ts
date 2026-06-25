import db from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  const body = await readBody(event)
  const { feishu_webhook, dingtalk_webhook } = body

  try {
    // 验证 Webhook URL 格式（基础验证）
    const urlRegex = /^https?:\/\/.+/
    if (feishu_webhook && !urlRegex.test(feishu_webhook)) {
      throw createError({
        statusCode: 400,
        message: '飞书 Webhook URL 格式不正确',
      })
    }
    if (dingtalk_webhook && !urlRegex.test(dingtalk_webhook)) {
      throw createError({
        statusCode: 400,
        message: '钉钉 Webhook URL 格式不正确',
      })
    }

    // 更新用户 Webhook 配置
    db.prepare(
      `UPDATE users SET
        feishu_webhook = ?,
        dingtalk_webhook = ?,
        updated_at = datetime('now')
       WHERE id = ?`,
    ).run(feishu_webhook || null, dingtalk_webhook || null, auth.userId)

    return {
      success: true,
      message: 'Webhook 配置已更新',
      data: {
        feishuConfigured: !!feishu_webhook,
        dingtalkConfigured: !!dingtalk_webhook,
      },
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: '更新 Webhook 配置失败: ' + error.message,
    })
  }
})
