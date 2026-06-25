import db from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  const reportId = parseInt(getRouterParam(event, 'id') || '0')

  if (!reportId) {
    throw createError({
      statusCode: 400,
      message: '无效的报告ID',
    })
  }

  try {
    // 获取报告
    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId) as any

    if (!report) {
      throw createError({
        statusCode: 404,
        message: '报告不存在',
      })
    }

    // 验证话题归属
    const topic = db.prepare('SELECT * FROM topics WHERE id = ? AND user_id = ?').get(report.topic_id, auth.userId)

    if (!topic) {
      throw createError({
        statusCode: 403,
        message: '无权限访问此报告',
      })
    }

    return {
      success: true,
      data: {
        id: report.id,
        topicId: report.topic_id,
        fileName: report.file_name,
        filePath: report.file_path,
        sentimentDist: JSON.parse(report.sentiment_dist || '{}'),
        riskLevel: report.risk_level,
        summary: report.summary,
        createdAt: report.created_at,
      },
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: '获取报告失败: ' + error.message,
    })
  }
})
