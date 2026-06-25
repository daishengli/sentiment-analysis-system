import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import type { AlertPayload } from './webhook'

export interface ReportData {
  keyword: string
  createdAt: string
  articles: Array<{
    title: string
    platform: string
    sentiment: string
    score: number
    source: string
    author: string
    publishedAt: string
    url: string
  }>
  sentimentDist: {
    positive: number
    neutral: number
    negative: number
  }
  riskLevel: 'green' | 'yellow' | 'red'
  summary: string
  topTopics: string[]
  suggestions: string[]
}

function getRiskBadge(level: 'green' | 'yellow' | 'red'): string {
  switch (level) {
    case 'green':
      return '🟢 舆情正常'
    case 'yellow':
      return '🟡 舆情预警'
    case 'red':
      return '🔴 舆情告警'
  }
}

function formatTime(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

export function generateMarkdownReport(data: ReportData): string {
  const total = data.sentimentDist.positive + data.sentimentDist.neutral + data.sentimentDist.negative
  const posPercent = total > 0 ? ((data.sentimentDist.positive / total) * 100).toFixed(1) : '0'
  const negPercent = total > 0 ? ((data.sentimentDist.negative / total) * 100).toFixed(1) : '0'
  const neuPercent = total > 0 ? ((data.sentimentDist.neutral / total) * 100).toFixed(1) : '0'

  const timeStr = new Date(data.createdAt).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return `# 舆情分析报告

**关键词：** ${data.keyword}  
**生成时间：** ${timeStr}  
**预警状态：** ${getRiskBadge(data.riskLevel)}

---

## 📊 执行摘要

${data.summary}

---

## 📈 舆情概览

| 情感类型 | 文章数 | 占比 |
|---------|--------|------|
| 🟢 正面 | ${data.sentimentDist.positive} | ${posPercent}% |
| 🔴 负面 | ${data.sentimentDist.negative} | ${negPercent}% |
| ⚪ 中性 | ${data.sentimentDist.neutral} | ${neuPercent}% |
| **合计** | **${total}** | **100%** |

---

## 🔥 热门话题

${data.topTopics.length > 0 ? data.topTopics.map((t, i) => `${i + 1}. ${t}`).join('\n') : '暂无热门话题数据'}

---

## 📝 重点文章

${data.articles
  .sort((a, b) => {
    if (a.sentiment === 'negative' && b.sentiment !== 'negative') return -1
    if (a.sentiment !== 'negative' && b.sentiment === 'negative') return 1
    return b.score - a.score
  })
  .slice(0, 20)
  .map(
    (article, i) => `
### ${i + 1}. ${article.title}

- **平台：** ${article.platform}
- **来源：** ${article.source}
- **作者：** ${article.author}
- **发布时间：** ${article.publishedAt ? new Date(article.publishedAt).toLocaleString('zh-CN') : '未知'}
- **情感：** ${article.sentiment === 'positive' ? '🟢 正面' : article.sentiment === 'negative' ? '🔴 负面' : '⚪ 中性'}
- **链接：** ${article.url || '无'}
`,
  )
  .join('\n')}

---

## 💡 建议与结论

${data.suggestions.length > 0 ? data.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n') : '暂无建议'}

---

*本报告由舆情星探 (PulseMind) 自动生成*  
*生成时间：${timeStr}*
`
}

export function generateHTMLReport(data: ReportData): string {
  const timeStr = new Date(data.createdAt).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  const total = data.sentimentDist.positive + data.sentimentDist.neutral + data.sentimentDist.negative

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>舆情分析报告 - ${data.keyword}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 900px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; }
    .header h1 { font-size: 24px; margin-bottom: 10px; }
    .header .meta { opacity: 0.9; font-size: 14px; }
    .risk-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-weight: bold; margin-top: 15px; }
    .risk-green { background: #22c55e; }
    .risk-yellow { background: #eab308; color: #1f2937; }
    .risk-red { background: #ef4444; }
    .content { background: white; padding: 30px; border-radius: 0 0 12px 12px; }
    .section { margin-bottom: 30px; }
    .section h2 { font-size: 18px; color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; margin-bottom: 15px; }
    .summary { background: #f3f4f6; padding: 20px; border-radius: 8px; line-height: 1.8; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; }
    .stat-card { text-align: center; padding: 20px; border-radius: 8px; }
    .stat-positive { background: #dcfce7; color: #166534; }
    .stat-negative { background: #fee2e2; color: #991b1b; }
    .stat-neutral { background: #f3f4f6; color: #374151; }
    .stat-number { font-size: 32px; font-weight: bold; }
    .stat-label { font-size: 14px; margin-top: 5px; }
    .topic-list { display: flex; flex-wrap: wrap; gap: 10px; }
    .topic-tag { background: #eff6ff; color: #2563eb; padding: 6px 14px; border-radius: 16px; font-size: 14px; }
    .article-list { display: flex; flex-direction: column; gap: 15px; }
    .article-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; }
    .article-title { font-weight: 600; color: #1f2937; margin-bottom: 8px; }
    .article-meta { font-size: 12px; color: #6b7280; display: flex; gap: 15px; flex-wrap: wrap; }
    .sentiment-badge { padding: 2px 8px; border-radius: 4px; font-size: 12px; }
    .sentiment-positive { background: #dcfce7; color: #166534; }
    .sentiment-negative { background: #fee2e2; color: #991b1b; }
    .sentiment-neutral { background: #f3f4f6; color: #374151; }
    .suggestions { list-style: none; }
    .suggestions li { padding: 10px 0; border-bottom: 1px solid #e5e7eb; display: flex; align-items: flex-start; gap: 10px; }
    .suggestions li:last-child { border-bottom: none; }
    .suggestions .num { background: #2563eb; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
    @media print { body { background: white; padding: 0; } .container { max-width: 100%; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔍 舆情分析报告</h1>
      <div class="meta">
        <div>关键词：<strong>${data.keyword}</strong></div>
        <div>生成时间：${timeStr}</div>
      </div>
      <div class="risk-badge risk-${data.riskLevel}">
        ${getRiskBadge(data.riskLevel)}
      </div>
    </div>
    
    <div class="content">
      <div class="section">
        <h2>📊 执行摘要</h2>
        <div class="summary">${data.summary}</div>
      </div>
      
      <div class="section">
        <h2>📈 舆情概览</h2>
        <div class="stats">
          <div class="stat-card stat-positive">
            <div class="stat-number">${data.sentimentDist.positive}</div>
            <div class="stat-label">🟢 正面</div>
          </div>
          <div class="stat-card stat-negative">
            <div class="stat-number">${data.sentimentDist.negative}</div>
            <div class="stat-label">🔴 负面</div>
          </div>
          <div class="stat-card stat-neutral">
            <div class="stat-number">${data.sentimentDist.neutral}</div>
            <div class="stat-label">⚪ 中性</div>
          </div>
        </div>
      </div>
      
      <div class="section">
        <h2>🔥 热门话题</h2>
        <div class="topic-list">
          ${data.topTopics.length > 0 ? data.topTopics.map(t => `<span class="topic-tag">${t}</span>`).join('') : '<span class="topic-tag">暂无数据</span>'}
        </div>
      </div>
      
      <div class="section">
        <h2>📝 重点文章</h2>
        <div class="article-list">
          ${data.articles
            .sort((a, b) => {
              if (a.sentiment === 'negative' && b.sentiment !== 'negative') return -1
              if (a.sentiment !== 'negative' && b.sentiment === 'negative') return 1
              return b.score - a.score
            })
            .slice(0, 20)
            .map(
              (article) => `
            <div class="article-card">
              <div class="article-title">${article.title}</div>
              <div class="article-meta">
                <span>📌 ${article.platform}</span>
                <span>👤 ${article.author}</span>
                <span>📅 ${article.publishedAt ? new Date(article.publishedAt).toLocaleString('zh-CN') : '未知'}</span>
                <span class="sentiment-badge sentiment-${article.sentiment}">
                  ${article.sentiment === 'positive' ? '🟢 正面' : article.sentiment === 'negative' ? '🔴 负面' : '⚪ 中性'}
                </span>
              </div>
            </div>
          `,
            )
            .join('')}
        </div>
      </div>
      
      <div class="section">
        <h2>💡 建议与结论</h2>
        <ul class="suggestions">
          ${data.suggestions.length > 0 ? data.suggestions.map((s, i) => `<li><span class="num">${i + 1}</span><span>${s}</span></li>`).join('') : '<li><span>暂无建议</span></li>'}
        </ul>
      </div>
      
      <div class="footer">
        本报告由舆情星探 (PulseMind) 自动生成<br>
        生成时间：${timeStr}
      </div>
    </div>
  </div>
</body>
</html>`
}

export async function saveReport(data: ReportData): Promise<{ fileName: string; filePath: string }> {
  const reportsDir = join(process.cwd(), 'data', 'reports')
  if (!existsSync(reportsDir)) {
    mkdirSync(reportsDir, { recursive: true })
  }

  const timestamp = formatTime(new Date())
  const safeKeyword = data.keyword.replace(/[^\w\u4e00-\u9fa5]/g, '_')
  const fileName = `舆情报告_${safeKeyword}_${timestamp}.html`
  const filePath = join(reportsDir, fileName)

  const html = generateHTMLReport(data)
  writeFileSync(filePath, html, 'utf-8')

  console.log(`报告已保存: ${filePath}`)

  return { fileName, filePath }
}
