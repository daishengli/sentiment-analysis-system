import Database from 'better-sqlite3'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

// 确保数据目录存在
const dataDir = './data'
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true })
}

const dbPath = join(dataDir, 'pulsemind.db')
const db = new Database(dbPath)

// 启用 WAL 模式提升性能
db.pragma('journal_mode = WAL')

// 初始化数据库表
export function initDB() {
  db.exec(`
    -- 用户表
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      feishu_webhook TEXT,
      dingtalk_webhook TEXT,
      plan TEXT DEFAULT 'free' CHECK(plan IN ('free', 'paid')),
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 舆情话题表
    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      keyword TEXT NOT NULL,
      refresh_interval INTEGER DEFAULT 60,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 文章表
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id INTEGER NOT NULL,
      platform TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT,
      source TEXT,
      author TEXT,
      published_at DATETIME,
      summary TEXT,
      content TEXT,
      sentiment TEXT CHECK(sentiment IN ('positive', 'neutral', 'negative')),
      score INTEGER DEFAULT 3,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
    );

    -- 报告表
    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT,
      sentiment_dist TEXT,
      risk_level TEXT CHECK(risk_level IN ('green', 'yellow', 'red')),
      summary TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
    );

    -- 定时任务表
    CREATE TABLE IF NOT EXISTS cron_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'completed', 'failed')),
      result TEXT,
      run_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
    );

    -- 创建索引
    CREATE INDEX IF NOT EXISTS idx_topics_user_id ON topics(user_id);
    CREATE INDEX IF NOT EXISTS idx_articles_topic_id ON articles(topic_id);
    CREATE INDEX IF NOT EXISTS idx_articles_platform ON articles(platform);
    CREATE INDEX IF NOT EXISTS idx_reports_topic_id ON reports(topic_id);
    CREATE INDEX IF NOT EXISTS idx_cron_tasks_topic_id ON cron_tasks(topic_id);
  `)
}

// 初始化
initDB()

export default db
