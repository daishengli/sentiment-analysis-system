# 舆情星探 (PulseMind) - 产品需求文档

> **项目代号：** PulseMind  
> **版本：** v1.0  
> **日期：** 2026-06-23  
> **状态：** 已确认，待开发

---

## 一、项目概述

### 1.1 项目背景

在信息爆炸的时代，舆情监测已成为政府、企业、品牌方不可获取的战略能力。传统人工舆情监测效率低、成本高、覆盖窄，难以满足实时性需求。

### 1.2 项目目标

构建一个**智能化、自动化、可持续**的舆情分析系统，对指定关键词进行全网信息采集、AI 智能分析，并自动生成结构化舆情报告。

核心价值：**输入一个关键词，输出一份可决策的报告。**

### 1.3 产品名称

**舆情星探 (PulseMind)**

### 1.4 目标用户

- 企业品牌公关部
- 领导层（查看报告）
- 政府宣传部门（未来扩展）

---

## 二、商业模式

### 2.1 订阅分层

| 功能 | 免费版 | 付费版 |
|------|--------|--------|
| 可监测话题数 | 1 个 | 不限 |
| 刷新频率 | 默认 1 小时 | 可设置 10 分钟起 |
| 报告保留时间 | 7 天 | 1 年 |
| 导出报告 | 不限 | 不限 |
| 飞书/钉钉通知 | ✅ | ✅ |

### 2.2 付费墙触发点

- 免费用户：只能监测 1 个舆情话题
- 想添加更多话题 → 需订阅付费版
- 想提高刷新频率（10分钟级）→ 需订阅付费版

---

## 三、功能需求

### 3.1 用户体系

- **注册/登录**：邮箱 + 密码
- **用户信息**：用户名、邮箱、密码（加密存储）
- **Webhook 配置**：飞书/钉钉 Webhook URL（用户自定义配置）
- **订阅状态**：免费/付费、到期时间

### 3.2 核心功能模块

#### 3.2.1 舆情话题管理
- 创建舆情话题（输入关键词）
- 设置刷新频率（免费用户默认 1 小时，付费用户 10 分钟起）
- 开启/暂停话题监测
- 删除话题
- 话题列表展示（状态、创建时间、最近分析时间）

#### 3.2.2 数据采集模块
- **数据源覆盖**（除微信公众号外全覆盖）：
  - 微博
  - 知乎
  - 抖音
  - 小红书
  - B 站
  - 百家号（百度）
  - 新闻网站（新浪/腾讯/网易/搜狐等主流）
- 每平台采集 50-100 条结果
- 去重与数据清洗
- 存储原始数据

#### 3.2.3 AI 智能分析模块
- **情感分析**：正面 / 负面 / 中性
- **情感强度**：1-5 分
- **话题聚类**：自动归类相关内容
- **关键人物/机构提取**
- **热点事件提取**

#### 3.2.4 预警系统（三色预警）

| 状态 | 触发条件 | 通知方式 |
|------|----------|----------|
| 🟢 绿色 | 负面比例 < 20% | 无需通知 |
| 🟡 黄色 | 负面比例 20%-50% | Webhook 提醒 |
| 🔴 红色 | 负面比例 > 50% | Webhook 紧急提醒 |

- 预警时自动通过用户配置的 Webhook（飞书/钉钉）推送通知
- 报告中醒目展示当前预警状态

#### 3.2.5 报告生成模块
- **在线查看**：专属报告页面
- **PDF 导出**：文件名带完整时间戳，格式：`舆情报告_关键词_YYYYMMDD_HHMMSS.pdf`
- 报告包含：
  - 执行摘要
  - 舆情概览（正/负/中比例）
  - 三色预警状态
  - 热门话题 TOP N
  - 重点文章列表
  - 情感趋势（若有多次数据）
  - 建议与结论

#### 3.2.6 持续监测
- 后台定时任务，按设定频率自动刷新
- 每次刷新独立生成报告
- 历史报告可追溯

---

## 四、技术架构

### 4.1 技术栈

| 层级 | 技术选型 |
|------|---------|
| 前端 + 后端 | Nuxt 3（全栈，JavaScript） |
| 数据库 | SQLite（可通过 Docker 替换为 PostgreSQL） |
| AI 能力 | OpenAI SDK（可配置 base_url + api_key） |
| 爬虫 | Playwright / Puppeteer / cheerio |
| 定时任务 | node-cron |
| PDF 导出 | pupdfkit / html2pdf |
| 部署 | Docker + Docker Compose |
| 认证 | JWT Token |

### 4.2 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                      用户层                              │
│              Web UI (Nuxt Pages)                         │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                  Nuxt Server (API Routes)               │
│  话题管理 │ 用户认证 │ Webhook配置 │ 报告接口             │
└─────────────────────┬───────────────────────────────────┘
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐
│   数据采集层     │       │   AI 分析引擎    │
│  (多平台爬虫)    │       │  (OpenAI SDK)    │
└─────────────────┘       └─────────────────┘
         │                         │
         └────────────┬────────────┘
                      ▼
           ┌──────────────────┐
           │   SQLite 数据库    │
           └──────────────────┘
```

### 4.3 数据库模型

#### users
```
id          INTEGER PRIMARY KEY
username    TEXT UNIQUE
email       TEXT UNIQUE
password    TEXT (bcrypt hash)
feishu_webhook  TEXT (nullable)
dingtalk_webhook TEXT (nullable)
plan        TEXT DEFAULT 'free'  -- 'free' | 'paid'
expires_at  DATETIME
created_at  DATETIME
updated_at  DATETIME
```

#### topics
```
id          INTEGER PRIMARY KEY
user_id     INTEGER FK
keyword     TEXT
refresh_interval INTEGER DEFAULT 60  -- 分钟，付费用户可设10分钟起
status      TEXT DEFAULT 'active'  -- 'active' | 'paused'
created_at  DATETIME
updated_at  DATETIME
```

#### articles
```
id          INTEGER PRIMARY KEY
topic_id    INTEGER FK
platform    TEXT  -- 'weibo' | 'zhihu' | 'douyin' | 'xhs' | 'bilibili' | 'baijiahao' | 'news'
title       TEXT
url         TEXT
source      TEXT
author      TEXT
published_at DATETIME
summary     TEXT
content     TEXT
sentiment   TEXT  -- 'positive' | 'neutral' | 'negative'
score       INTEGER  -- 1-5
created_at  DATETIME
```

#### reports
```
id          INTEGER PRIMARY KEY
topic_id    INTEGER FK
file_name   TEXT
file_path   TEXT
sentiment_dist JSON
risk_level  TEXT  -- 'green' | 'yellow' | 'red'
summary     TEXT
created_at  DATETIME
```

#### cron_tasks
```
id          INTEGER PRIMARY KEY
topic_id    INTEGER FK
status      TEXT  -- 'pending' | 'running' | 'completed' | 'failed'
result      TEXT
run_at      DATETIME
created_at  DATETIME
```

---

## 五、API 设计

### 5.1 认证
| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/auth/register` | POST | 注册 |
| `/api/auth/login` | POST | 登录，返回 JWT |
| `/api/auth/me` | GET | 获取当前用户信息 |

### 5.2 话题管理
| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/topics` | GET | 获取话题列表 |
| `/api/topics` | POST | 创建话题 |
| `/api/topics/:id` | PUT | 更新话题 |
| `/api/topics/:id` | DELETE | 删除话题 |

### 5.3 舆情分析
| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/topics/:id/run` | POST | 手动触发一次分析 |
| `/api/topics/:id/reports` | GET | 获取该话题的报告列表 |

### 5.4 报告
| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/reports/:id` | GET | 获取报告详情 |
| `/api/reports/:id/export` | GET | 导出 PDF |

### 5.5 Webhook 配置
| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/settings/webhook` | PUT | 更新 Webhook 配置 |

---

## 六、非功能性需求

| 维度 | 要求 |
|------|------|
| 单次分析速度 | ≤ 5 分钟（取决于数据量） |
| 情感判断准确率 | 目标 ≥ 85% |
| 可用性 | 支持 7x24 后台运行 |
| 可扩展性 | 模块化设计，便于接入新数据源 |
| 预警延迟 | 采集完成后 1 分钟内触发 Webhook |
| PDF 报告时间戳 | 精确到秒，格式：`YYYYMMDD_HHMMSS` |

---

## 七、Docker 部署

### 7.1 容器规划

| 容器 | 说明 |
|------|------|
| `pulsemind-app` | Nuxt 应用（前后端一体） |
| `pulsemind-db` | SQLite 数据文件卷 |

### 7.2 环境变量

```
NITRO_PORT=3000
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.openai.com/v1
JWT_SECRET=xxx
```

---

## 八、开发计划

### Phase 1：基础框架搭建
- [ ] Nuxt 3 项目初始化
- [ ] 数据库 schema 设计
- [ ] 用户注册/登录（JWT）
- [ ] 基础页面布局

### Phase 2：核心功能
- [ ] 话题 CRUD
- [ ] 多平台数据采集
- [ ] OpenAI 情感分析
- [ ] 报告生成
- [ ] 三色预警 + Webhook

### Phase 3：高级功能
- [ ] 定时任务调度
- [ ] PDF 导出
- [ ] 订阅体系（免费/付费）
- [ ] Docker 部署配置

### Phase 4：优化
- [ ] 数据源扩展
- [ ] UI 优化
- [ ] 性能优化

---

## 九、成功标准

| 指标 | 目标值 |
|------|--------|
| 单次分析完整率 | ≥ 95% |
| 报告生成成功率 | ≥ 98% |
| 预警触发准确率 | ≥ 90% |
| 系统可用性 | 7x24 |
