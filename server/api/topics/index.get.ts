import db from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)

  try {
    // 获取用户的舆情话题
    const topics = db
      .prepare(
        `SELECT t.*,
                (SELECT COUNT(*) FROM articles WHERE topic_id = t.id) as article_count,
                (SELECT COUNT(*) FROM reports WHERE topic_id = t.id) as report_count,
                (SELECT created_at FROM reports WHERE topic_id = t.id ORDER BY created_at DESC LIMIT 1) as last_report_at
         FROM topics t
         WHERE t.user_id = ?
         ORDER BY t.created_at DESC`,
      )
      .all(auth.userId) as any[]

    // 检查免费用户的话题数量限制
    const user = db.prepare('SELECT plan FROM users WHERE id = ?').get(auth.userId) as any
    const canAddMore = user.plan === 'paid' || topics.length < 1

    return {
      success: true,
      data: {
        topics: topics.map((t) => ({
          id: t.id,
          keyword: t.keyword,
          refreshInterval: t.refresh_interval,
          status: t.status,
          articleCount: t.article_count,
          reportCount: t.report_count,
          lastReportAt: t.last_report_at,
          createdAt: t.created_at,
        })),
        canAddMore,
        plan: user.plan,
      },
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      message: '获取话题列表失败: ' + error.message,
    })
  }
})
