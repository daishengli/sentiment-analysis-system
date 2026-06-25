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

  try {
    // 验证话题归属
    const topic = db.prepare('SELECT * FROM topics WHERE id = ? AND user_id = ?').get(id, auth.userId)

    if (!topic) {
      throw createError({
        statusCode: 404,
        message: '话题不存在或无权限',
      })
    }

    // 删除话题（级联删除关联的 articles 和 reports）
    db.prepare('DELETE FROM topics WHERE id = ?').run(id)

    return {
      success: true,
      message: '话题删除成功',
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: '删除话题失败: ' + error.message,
    })
  }
})
