import axios from 'axios'
import * as cheerio from 'cheerio'

export interface Article {
  title: string
  url: string
  source: string
  author: string
  publishedAt: string
  summary: string
  content: string
  platform: string
}

/**
 * ============== BING RSS SEARCH ==============
 * 免费、无需 API key，全球可用
 * Bing 中文搜索 — 返回混合 Web+新闻结果（RSS 格式）
 *
 * 每页10条，搜索最多3页，按 past 30 days 过滤时效
 */
async function searchBingRSS(keyword: string): Promise<Article[]> {
  const articles: Article[] = []
  const maxPages = 3

  for (let page = 0; page < maxPages; page++) {
    try {
      const response = await axios.get('https://www.bing.com/search', {
        params: {
          q: keyword,
          format: 'rss',
          count: 30,
          first: page * 10 + 1,
          cc: 'cn',
          setlang: 'zh-Hans',
        },
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          Accept: 'application/rss+xml, application/xml',
        },
        timeout: 15000,
      })

      const $ = cheerio.load(response.data, { xmlMode: true })
      const items = $('item')

      if (items.length === 0) break

      items.each((_, el) => {
        const title = $(el).find('title').text().trim()
        const link = $(el).find('link').text().trim()
        const pubDate = $(el).find('pubDate').text().trim()
        const descRaw = $(el).find('description').text().trim()
        const desc = cheerio.load(descRaw, { xmlMode: true }).text().trim()

        // 过滤：去掉纯 URL 作为标题的项（通常是导航页）
        if (!title || title.length < 3 || /^https?:\/\//i.test(title)) return
        // 过滤：太短的描述当作无效
        if (desc.length < 10) return

      let publishedAt = new Date().toISOString()
        if (pubDate) {
          const d = new Date(pubDate)
          if (isNaN(d.getTime())) {
            // Bing 中文 RSS 的日期格式："周三, 08 7月 2026 19:35:00 GMT"
            const m = pubDate.match(/(\d{1,2})\D+(\d{1,2})\D+(\d{4})\D+(\d{1,2}):(\d{2}):(\d{2})/)
            if (m) {
              publishedAt = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4]), Number(m[5]), Number(m[6])).toISOString()
            }
          } else {
            publishedAt = d.toISOString()
          }
        }

        articles.push({
          title,
          url: link,
          source: extractDomainName(link),
          author: '',
          publishedAt,
          summary: desc.slice(0, 300),
          content: desc,
          platform: 'bing',
        })
      })

      if (items.length < 10) break
    } catch (error: any) {
      const status = error.response?.status
      console.error(`[Bing RSS] page ${page + 1} error (${status}): ${error.message?.slice(0, 80)}`)
      if (status && status !== 429 && status !== 503) break
    }
  }

  return articles
}

/**
 * ============== NEWSAPI ==============
 * 如果有 API key，用 NewsAPI 获取更精确的新闻结果
 * 免费注册: https://newsapi.org/register
 * 免费版限制：结果100条、无历史数据、开发环境仅限 localhost
 */
async function searchNewsApi(keyword: string): Promise<Article[]> {
  const config = useRuntimeConfig()
  const apiKey = config.newsApiKey as string

  if (!apiKey) return []

  const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  const all: Article[] = []

  for (let page = 1; page <= 2; page++) {
    try {
      const response = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q: keyword,
          from: fromDate,
          language: 'zh',
          sortBy: 'publishedAt',
          pageSize: 50,
          page,
          apiKey,
        },
        headers: { 'User-Agent': 'PulseMind/1.0' },
        timeout: 15000,
      })

      const items = response.data?.articles || []
      for (const a of items) {
        if (!a.title) continue
        all.push({
          title: a.title,
          url: a.url || '',
          source: a.source?.name || '未知来源',
          author: a.author || '',
          publishedAt: a.publishedAt || new Date().toISOString(),
          summary: a.description || a.title || '',
          content: a.content || a.description || '',
          platform: 'newsapi',
        })
      }

      if (items.length < 50) break
    } catch (error: any) {
      const status = error.response?.status
      console.error(
        `[NewsAPI] page ${page} error (${status}): ${error.response?.data?.message || error.message}`,
      )
      if (status && status !== 429 && status !== 500 && status !== 503) break
    }
  }

  return all
}

/**
 * ============== 搜狗微信搜索 ==============
 * 返回微信公众号文章，中文内容质量高，无需 API key
 * 限制：需中国大陆网络环境
 */
async function searchSogouWechat(keyword: string): Promise<Article[]> {
  const articles: Article[] = []

  try {
    const response = await axios.get('https://weixin.sogou.com/weixin', {
      params: { type: 2, query: keyword, ie: 'utf8' },
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        Accept: 'text/html,application/xhtml+xml',
      },
      timeout: 15000,
    })

    const $ = cheerio.load(response.data)

    $('.news-list li').each((_, el) => {
      const titleEl = $(el).find('.txt-box h3 a')
      const title = titleEl.text().trim()
      const relativeUrl = titleEl.attr('href') || ''
      const source = $(el).find('.s-p .account').text().trim()
      const dateText = $(el).find('.s-p .s2').text().trim()
      const summary = $(el).find('.txt-info').text().trim()

      // 解析时间戳：sogou 使用 document.write(timeConvert('...')) 的 Unix 时间戳
      let publishedAt = new Date().toISOString()
      const tsMatch = dateText.match(/(\d{10})/)
      if (tsMatch) {
        publishedAt = new Date(Number(tsMatch[1]) * 1000).toISOString()
      }

      if (!title || title.length < 2) return

      articles.push({
        title,
        url: relativeUrl.startsWith('http') ? relativeUrl : `https://weixin.sogou.com${relativeUrl}`,
        source: source || '微信公众号',
        author: source || '',
        publishedAt,
        summary: summary.slice(0, 300),
        content: summary,
        platform: 'wechat',
      })
    })
  } catch (error: any) {
    console.error(`[Sogou WeChat] error: ${error.message?.slice(0, 80)}`)
  }

  return articles
}

function extractDomainName(url: string): string {
  try {
    if (!url) return '未知来源'
    // 处理相对路径
    const full = url.startsWith('http') ? url : `https://${url}`
    const hostname = new URL(full).hostname.replace(/^www\./, '')
    return hostname || '未知来源'
  } catch {
    return '未知来源'
  }
}

/**
 * ============== 搜索所有平台 ==============
 *
 * 多数据源并行采集（聚合自多个来源）：
 *   - Bing RSS 搜索（免费、全球可用）
 *   - NewsAPI 新闻（需 NEWSAPI_API_KEY 环境变量）
 *   - 搜狗微信搜索（免费、中国大陆）
 *
 * 返回去重后的 Article 数组。
 */
export async function searchAllPlatforms(keyword: string): Promise<Article[]> {
  console.log(`开始搜索关键词: ${keyword}`)

  const [bingResults, newsApiResults, sogouResults] = await Promise.allSettled([
    searchBingRSS(keyword),
    searchNewsApi(keyword),
    searchSogouWechat(keyword),
  ])

  const allArticles: Article[] = []

  const sources: [string, PromiseSettledResult<Article[]>][] = [
    ['Bing RSS', bingResults],
    ['NewsAPI', newsApiResults],
    ['搜狗微信', sogouResults],
  ]

  for (const [name, result] of sources) {
    if (result.status === 'fulfilled') {
      console.log(`${name} 采集到 ${result.value.length} 条`)
      allArticles.push(...result.value)
    } else {
      console.error(`${name} 采集失败:`, result.reason?.message || result.reason)
    }
  }

  // 去重（按标题前80字符）
  const seenTitles = new Set<string>()
  const uniqueArticles = allArticles.filter((a) => {
    const key = a.title.slice(0, 80).toLowerCase()
    if (seenTitles.has(key)) return false
    seenTitles.add(key)
    return true
  })

  console.log(`总计采集 ${allArticles.length} 条，去重后 ${uniqueArticles.length} 条`)

  // 按来源统计
  const sourceStats = new Map<string, number>()
  for (const a of uniqueArticles) {
    sourceStats.set(a.source, (sourceStats.get(a.source) || 0) + 1)
  }
  for (const [source, count] of [...sourceStats.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)) {
    console.log(`  ${source}: ${count} 条`)
  }

  return uniqueArticles
}
