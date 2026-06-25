import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
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
        message: '无权限下载此报告',
      })
    }

    // 检查文件是否存在
    if (!report.file_path || !existsSync(report.file_path)) {
      throw createError({
        statusCode: 404,
        message: '报告文件不存在',
      })
    }

    // 读取文件
    const fileContent = readFileSync(report.file_path)

    // 设置响应头
    setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
    setHeader(event, 'Content-Disposition', `attachment; filename="${encodeURIComponent(report.file_name)}"`)

    return fileContent
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      message: '下载报告失败: ' + error.message,
    })
  }
})
