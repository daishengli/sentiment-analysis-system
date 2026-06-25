import db from '~/server/utils/db'
import { searchAllPlatforms } from '~/server/utils/crawler'
import { analyzeSentiment, generateReportSummary } from '~/server/utils/openai'
import { saveReport } from '~/server/utils/report'
import { sendAllWebhooks } from '~/server/utils/webhook'

export default defineTask({
  meta: {
    name: 'sentiment-analysis',
    description: '定时分析活跃舆情话题',
  },

  async run() {
    console.log('[Task] 开始执行舆情分析定时任务')

    try {
      // 查找需要执行的话题（已过期且状态为 active）
      const topics = db
        .prepare(
          `SELECT t.*, u.plan, u.feishu_webhook, u.dingtalk_webhook
           FROM topics t
           JOIN users u ON t.user_id = u.id
           WHERE t.status = 'active'
           AND (u.plan = 'paid' OR u.expires_at IS NULL OR u.expires_at > datetime('now'))
           AND datetime(t.updated_at, '+' || t.refresh_interval || ' minutes') <= datetime('now')
           LIMIT 5`,
        )
        .all() as any[]

      if (topics.length === 0) {
        console.log('[Task] 没有需要执行的话题')
        return { result: 'no topics to process' }
      }

      console.log(`[Task] 发现 ${topics.length} 个需要分析的话题`)

      for (const topic of topics) {
        await analyzeTopic(topic)
      }

      return { result: `processed ${topics.length} topics` }
    } catch (error) {
      console.error('[Task] 定时任务执行失败:', error)
      return { result: 'error', error: String(error) }
    }
  },
})

async function analyzeTopic(topic: any) {
  console.log(`[Task] 开始分析话题: ${topic.keyword}`)

  try {
    // 更新话题时间戳（先锁住，防止重复执行）
    db.prepare("UPDATE topics SET updated_at = datetime('now') WHERE id = ? AND updated_at = ?").run(
      topic.id,
      topic.updated_at,
    )

    // 1. 搜索采集
    const articles = await searchAllPlatforms(topic.keyword)
    if (articles.length === 0) {
      console.log(`[Task] 话题 ${topic.keyword} 未采集到数据`)
      return
    }

    // 2. 保存文章并分析
    const insertStmt = db.prepare(
      `INSERT INTO articles (topic_id, platform, title, url, source, author, published_at, summary, content, sentiment, score, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    )

    let positiveCount = 0
    let negativeCount = 0
    let neutralCount = 0
    const analyzedArticles = []

    for (const article of articles) {
      try {
        const result = await analyzeSentiment(article.title + ' ' + article.summary)
        insertStmt.run(
          topic.id,
          article.platform,
          article.title,
          article.url || '',
          article.source || '',
          article.author || '',
          article.publishedAt || '',
          article.summary || '',
          article.content || '',
          result.sentiment,
          result.score,
        )
        analyzedArticles.push({ ...article, sentiment: result.sentiment, score: result.score })

        if (result.sentiment === 'positive') positiveCount++
        else if (result.sentiment === 'negative') negativeCount++
        else neutralCount++
      } catch (error) {
        console.error(`[Task] 文章分析失败: ${article.title}`, error)
      }
    }

    // 3. 生成报告
    const summaryResult = await generateReportSummary(
      topic.keyword,
      analyzedArticles.map((a) => ({ title: a.title, sentiment: a.sentiment, platform: a.platform })),
    )

    // 4. 保存报告
    const reportData = {
      keyword: topic.keyword,
      createdAt: new Date().toISOString(),
      articles: analyzedArticles.map((a) => ({
        title: a.title,
        platform: a.platform,
        sentiment: a.sentiment,
        score: a.score,
        source: a.source,
        author: a.author,
        publishedAt: a.publishedAt,
        url: a.url,
      })),
      sentimentDist: { positive: positiveCount, negative: negativeCount, neutral: neutralCount },
      riskLevel: summaryResult.riskLevel,
      summary: summaryResult.summary,
      topTopics: summaryResult.topTopics,
      suggestions: summaryResult.suggestions,
    }

    const { fileName, filePath } = await saveReport(reportData)

    db.prepare(
      `INSERT INTO reports (topic_id, file_name, file_path, sentiment_dist, risk_level, summary, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    ).run(
      topic.id,
      fileName,
      filePath,
      JSON.stringify(reportData.sentimentDist),
      summaryResult.riskLevel,
      summaryResult.summary,
    )

    // 5. 发送 Webhook（仅预警时）
    if (summaryResult.riskLevel !== 'green') {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(topic.user_id) as any
      if (user) {
        await sendAllWebhooks(user, {
          keyword: topic.keyword,
          riskLevel: summaryResult.riskLevel,
          positiveCount,
          negativeCount,
          neutralCount,
          totalCount: articles.length,
          negativeRatio: articles.length > 0 ? negativeCount / articles.length : 0,
          topTopics: summaryResult.topTopics,
        })
      }
    }

    console.log(`[Task] 话题 ${topic.keyword} 分析完成，预警级别: ${summaryResult.riskLevel}`)
  } catch (error) {
    console.error(`[Task] 话题 ${topic.keyword} 分析失败:`, error)
  }
}
