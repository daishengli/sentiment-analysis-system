import db from '~/server/utils/db'
import { searchAllPlatforms } from '~/server/utils/crawler'
import { analyzeSentiment, generateReportSummary } from '~/server/utils/openai'
import { generateHTMLReport, saveReport } from '~/server/utils/report'
import { sendAllWebhooks } from '~/server/utils/webhook'

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
    const topic = db.prepare('SELECT * FROM topics WHERE id = ? AND user_id = ?').get(topicId, auth.userId) as any

    if (!topic) {
      throw createError({
        statusCode: 404,
        message: '话题不存在或无权限',
      })
    }

    // 创建任务记录
    const taskResult = db
      .prepare("INSERT INTO cron_tasks (topic_id, status, run_at, created_at) VALUES (?, 'running', datetime('now'), datetime('now'))")
      .run(topicId)
    const taskId = taskResult.lastInsertRowid

    console.log(`开始分析话题: ${topic.keyword}, 任务ID: ${taskId}`)

    try {
      // 1. 搜索采集数据
      console.log('开始采集数据...')
      const articles = await searchAllPlatforms(topic.keyword)
      console.log(`采集到 ${articles.length} 条文章`)

      if (articles.length === 0) {
        db.prepare("UPDATE cron_tasks SET status = 'completed', result = ? WHERE id = ?").run(
          JSON.stringify({ message: '未采集到任何数据' }),
          taskId,
        )

        return {
          success: true,
          message: '未采集到数据',
          data: {
            taskId,
            articleCount: 0,
          },
        }
      }

      // 2. 保存原始文章数据
      const insertStmt = db.prepare(
        `INSERT INTO articles (topic_id, platform, title, url, source, author, published_at, summary, content, sentiment, score, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      )

      const analyzedArticles = []
      let positiveCount = 0
      let negativeCount = 0
      let neutralCount = 0

      // 3. 逐条分析情感（限制并发）
      const batchSize = 10
      for (let i = 0; i < articles.length; i += batchSize) {
        const batch = articles.slice(i, i + batchSize)
        console.log(`分析第 ${i + 1} - ${Math.min(i + batchSize, articles.length)} 条...`)

        const batchResults = await Promise.all(
          batch.map(async (article) => {
            try {
              const result = await analyzeSentiment(article.title + ' ' + article.summary)
              return { article, result }
            } catch (error) {
              console.error('情感分析失败:', error)
              return { article, result: { sentiment: 'neutral', score: 3, reason: '分析失败' } }
            }
          }),
        )

        for (const { article, result } of batchResults) {
          // 保存到数据库
          insertStmt.run(
            topicId,
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

          analyzedArticles.push({
            ...article,
            sentiment: result.sentiment,
            score: result.score,
          })

          if (result.sentiment === 'positive') positiveCount++
          else if (result.sentiment === 'negative') negativeCount++
          else neutralCount++
        }
      }

      console.log(`情感分析完成: 正面${positiveCount}, 负面${negativeCount}, 中性${neutralCount}`)

      // 4. 生成报告摘要
      console.log('生成报告摘要...')
      const summaryResult = await generateReportSummary(
        topic.keyword,
        analyzedArticles.map((a) => ({
          title: a.title,
          sentiment: a.sentiment,
          platform: a.platform,
        })),
      )

      // 5. 保存报告
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
        sentimentDist: {
          positive: positiveCount,
          negative: negativeCount,
          neutral: neutralCount,
        },
        riskLevel: summaryResult.riskLevel,
        summary: summaryResult.summary,
        topTopics: summaryResult.topTopics,
        suggestions: summaryResult.suggestions,
      }

      const { fileName, filePath } = await saveReport(reportData)

      // 6. 保存报告记录
      const reportResult = db
        .prepare(
          `INSERT INTO reports (topic_id, file_name, file_path, sentiment_dist, risk_level, summary, created_at)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        )
        .run(
          topicId,
          fileName,
          filePath,
          JSON.stringify(reportData.sentimentDist),
          summaryResult.riskLevel,
          summaryResult.summary,
        )

      // 7. 发送 Webhook 通知（仅在黄色或红色预警时）
      if (summaryResult.riskLevel !== 'green') {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(auth.userId) as any
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

      // 更新任务状态
      db.prepare("UPDATE cron_tasks SET status = 'completed', result = ? WHERE id = ?").run(
        JSON.stringify({ reportId: reportResult.lastInsertRowid, articleCount: articles.length }),
        taskId,
      )

      console.log(`话题分析完成: ${topic.keyword}, 报告ID: ${reportResult.lastInsertRowid}`)

      return {
        success: true,
        message: '分析完成',
        data: {
          taskId,
          reportId: reportResult.lastInsertRowid,
          articleCount: articles.length,
          sentimentDist: {
            positive: positiveCount,
            negative: negativeCount,
            neutral: neutralCount,
          },
          riskLevel: summaryResult.riskLevel,
          summary: summaryResult.summary,
          topTopics: summaryResult.topTopics,
          fileName,
          filePath,
        },
      }
    } catch (error: any) {
      console.error('分析过程出错:', error)
      db.prepare("UPDATE cron_tasks SET status = 'failed', result = ? WHERE id = ?").run(
        JSON.stringify({ error: error.message }),
        taskId,
      )

      throw createError({
        statusCode: 500,
        message: '分析失败: ' + error.message,
      })
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: '运行分析失败: ' + error.message,
    })
  }
})
