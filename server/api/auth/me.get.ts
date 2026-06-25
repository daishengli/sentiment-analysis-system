import db from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)

  try {
    const user = db
      .prepare(
        `SELECT id, username, email, plan, expires_at, feishu_webhook, dingtalk_webhook, created_at
         FROM users WHERE id = ?`,
      )
      .get(auth.userId) as any

    if (!user) {
      throw createError({
        statusCode: 404,
        message: '用户不存在',
      })
    }

    return {
      success: true,
      data: {
        userId: user.id,
        username: user.username,
        email: user.email,
        plan: user.plan,
        expiresAt: user.expires_at,
        webhookConfig: {
          feishu: !!user.feishu_webhook,
          dingtalk: !!user.dingtalk_webhook,
        },
        createdAt: user.created_at,
      },
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: '获取用户信息失败: ' + error.message,
    })
  }
})
