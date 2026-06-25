import db from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  const id = parseInt(getRouterParam(event, 'id') || '0')

  if (!id) {
    throw createError({
      statusCode: 400,
      message: '无效的话题ID',
    })
  }

  // 验证话题归属
  const topic = db.prepare('SELECT * FROM topics WHERE id = ? AND user_id = ?').get(id, auth.userId) as any

  if (!topic) {
    throw createError({
      statusCode: 404,
      message: '话题不存在或无权限',
    })
  }

  const body = await readBody(event)
  const { keyword, refreshInterval, status } = body

  try {
    const updates: string[] = []
    const values: any[] = []

    if (keyword) {
      updates.push('keyword = ?')
      values.push(keyword.trim())
    }

    if (refreshInterval !== undefined) {
      const user = db.prepare('SELECT plan FROM users WHERE id = ?').get(auth.userId) as any
      let interval = refreshInterval

      // 权限检查
      if (user.plan === 'free' && interval < 60) {
        interval = 60
      }
      if (interval < 10) {
        interval = 10
      }

      updates.push('refresh_interval = ?')
      values.push(interval)
    }

    if (status && ['active', 'paused'].includes(status)) {
      updates.push('status = ?')
      values.push(status)
    }

    if (updates.length === 0) {
      throw createError({
        statusCode: 400,
        message: '没有需要更新的字段',
      })
    }

    updates.push("updated_at = datetime('now')")
    values.push(id)

    db.prepare(`UPDATE topics SET ${updates.join(', ')} WHERE id = ?`).run(...values)

    const updatedTopic = db.prepare('SELECT * FROM topics WHERE id = ?').get(id) as any

    return {
      success: true,
      message: '话题更新成功',
      data: {
        id: updatedTopic.id,
        keyword: updatedTopic.keyword,
        refreshInterval: updatedTopic.refresh_interval,
        status: updatedTopic.status,
        updatedAt: updatedTopic.updated_at,
      },
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: '更新话题失败: ' + error.message,
    })
  }
})
