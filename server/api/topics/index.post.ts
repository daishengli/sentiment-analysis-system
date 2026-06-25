import db from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  const body = await readBody(event)
  const { keyword, refreshInterval } = body

  if (!keyword || keyword.trim() === '') {
    throw createError({
      statusCode: 400,
      message: '关键词不能为空',
    })
  }

  try {
    // 检查免费用户的话题数量限制
    const user = db.prepare('SELECT plan FROM users WHERE id = ?').get(auth.userId) as any
    const topicCount = db
      .prepare('SELECT COUNT(*) as count FROM topics WHERE user_id = ?')
      .get(auth.userId) as any

    if (user.plan === 'free' && topicCount.count >= 1) {
      throw createError({
        statusCode: 403,
        message: '免费用户只能监测1个舆情话题，请升级到付费版添加更多话题',
      })
    }

    // 验证刷新频率
    let interval = refreshInterval || 60
    if (user.plan === 'free' && interval < 60) {
      interval = 60 // 免费用户最低1小时
    }
    if (interval < 10) {
      interval = 10 // 最低10分钟
    }

    // 创建话题
    const result = db
      .prepare(
        `INSERT INTO topics (user_id, keyword, refresh_interval, status, created_at, updated_at)
         VALUES (?, ?, ?, 'active', datetime('now'), datetime('now'))`,
      )
      .run(auth.userId, keyword.trim(), interval)

    const topicId = result.lastInsertRowid

    return {
      success: true,
      message: '话题创建成功',
      data: {
        id: topicId,
        keyword: keyword.trim(),
        refreshInterval: interval,
        status: 'active',
      },
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: '创建话题失败: ' + error.message,
    })
  }
})
