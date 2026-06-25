import db from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  const topicId = parseInt(getRouterParam(event, 'id') || '0')

  if (!topicId) {
    throw createError({
      statusCode: 400,
      message: '无效的话题ID',
    })
  }

  try {
    // 验证话题归属
    const topic = db.prepare('SELECT * FROM topics WHERE id = ? AND user_id = ?').get(topicId, auth.userId)

    if (!topic) {
      throw createError({
        statusCode: 404,
        message: '话题不存在或无权限',
      })
    }

    // 获取报告列表
    const reports = db
      .prepare('SELECT * FROM reports WHERE topic_id = ? ORDER BY created_at DESC LIMIT 50')
      .all(topicId) as any[]

    return {
      success: true,
      data: {
        reports: reports.map((r) => ({
          id: r.id,
          fileName: r.file_name,
          sentimentDist: JSON.parse(r.sentiment_dist || '{}'),
          riskLevel: r.risk_level,
          summary: r.summary,
          createdAt: r.created_at,
        })),
      },
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: '获取报告列表失败: ' + error.message,
    })
  }
})
