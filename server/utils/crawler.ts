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

export interface Crawler {
  name: string
  search: (keyword: string) => Promise<Article[]>
}

// 通用搜索爬虫
async function searchBing(keyword: string): Promise<Article[]> {
  const articles: Article[] = []
  try {
    const response = await axios.get('https://www.bing.com/news/search', {
      params: {
        q: keyword,
        first: 1,
        cc: 'cn',
      },
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 10000,
    })

    const $ = cheerio.load(response.data)
    $('.news-item').each((_, el) => {
      const title = $(el).find('a.title').text().trim()
      const url = $(el).find('a.title').attr('href') || ''
      const source = $(el).find('.source').text().trim()
      const date = $(el).find('.news-date').text().trim()

      if (title && url) {
        articles.push({
          title,
          url,
          source,
          author: '',
          publishedAt: date,
          summary: '',
          content: '',
          platform: 'bing_news',
        })
      }
    })
  } catch (error) {
    console.error('Bing search error:', error)
  }
  return articles
}

// 微博搜索
async function searchWeibo(keyword: string): Promise<Article[]> {
  const articles: Article[] = []
  try {
    const response = await axios.get('https://m.weibo.cn/api/container/getIndex', {
      params: {
        containerid: '100103type=1&q=' + encodeURIComponent(keyword),
        page_type: 'searchall',
      },
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        Referer: 'https://m.weibo.cn',
      },
      timeout: 10000,
    })

    const cards = response.data?.data?.cards || []
    for (const card of cards.slice(0, 50)) {
      const mblog = card.mblog || card
      if (mblog.text) {
        articles.push({
          title: mblog.text.replace(/<[^>]+>/g, '').substring(0, 100),
          url: `https://weibo.com/${mblog.user?.idstr || ''}/status/${mblog.id}`,
          source: '微博',
          author: mblog.user?.screen_name || '匿名',
          publishedAt: new Date(mblog.created_at).toISOString(),
          summary: mblog.text.replace(/<[^>]+>/g, '').substring(0, 200),
          content: mblog.text,
          platform: 'weibo',
        })
      }
    }
  } catch (error) {
    console.error('Weibo search error:', error)
  }
  return articles
}

// 知乎搜索
async function searchZhihu(keyword: string): Promise<Article[]> {
  const articles: Article[] = []
  try {
    const response = await axios.get('https://www.zhihu.com/api/v4/search_v3', {
      params: {
        t: 'general',
        q: keyword,
        correction: 1,
        offset: 0,
        limit: 20,
        filter_fields: '',
        lc_idx: 0,
        show_all_topics: 0,
      },
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'X-API-VERSION': '3.0.40',
        'X-App-Za': 'OS=Web',
      },
      timeout: 10000,
    })

    const items = response.data?.data || []
    for (const item of items.slice(0, 50)) {
      if (item.object?.title) {
        articles.push({
          title: item.object.title,
          url: item.object.url || item.object.link?.url || '',
          source: '知乎',
          author: item.object.author?.name || '知乎用户',
          publishedAt: item.object.updated_time
            ? new Date(item.object.updated_time * 1000).toISOString()
            : new Date().toISOString(),
          summary: item.object.excerpt || '',
          content: item.object.excerpt || '',
          platform: 'zhihu',
        })
      }
    }
  } catch (error) {
    console.error('Zhihu search error:', error)
  }
  return articles
}

// 百家号搜索
async function searchBaijiahao(keyword: string): Promise<Article[]> {
  const articles: Article[] = []
  try {
    const response = await axios.get('https://mbd.baidu.com/searchbox', {
      params: {
        action: 'searchbox',
        query: keyword,
        type: 'news',
      },
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      },
      timeout: 10000,
    })

    const items = response.data?.data?.items || []
    for (const item of items.slice(0, 50)) {
      if (item.title) {
        articles.push({
          title: item.title,
          url: item.url || '',
          source: '百家号',
          author: item.author || '百家号作者',
          publishedAt: item.publish_time
            ? new Date(item.publish_time * 1000).toISOString()
            : new Date().toISOString(),
          summary: item.abstract || '',
          content: item.abstract || '',
          platform: 'baijiahao',
        })
      }
    }
  } catch (error) {
    console.error('Baijiahao search error:', error)
  }
  return articles
}

// 搜索所有平台
export async function searchAllPlatforms(keyword: string): Promise<Article[]> {
  console.log(`开始搜索关键词: ${keyword}`)

  const results = await Promise.allSettled([
    searchWeibo(keyword),
    searchZhihu(keyword),
    searchBaijiahao(keyword),
    searchBing(keyword),
  ])

  const allArticles: Article[] = []
  const platformNames = ['微博', '知乎', '百家号', 'Bing新闻']

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(`${platformNames[index]} 采集到 ${result.value.length} 条`)
      allArticles.push(...result.value)
    } else {
      console.error(`${platformNames[index]} 采集失败:`, result.reason)
    }
  })

  // 去重
  const uniqueArticles = allArticles.filter(
    (article, index, self) => index === self.findIndex((a) => a.title === article.title),
  )

  console.log(`总计采集 ${uniqueArticles.length} 条，去重后 ${uniqueArticles.length} 条`)
  return uniqueArticles
}
