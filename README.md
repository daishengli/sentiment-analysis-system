# 舆情星探 (PulseMind)

> 🔍 智能化舆情监测与分析平台

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)

## 功能特性

- 📊 **全网覆盖**：微博、知乎、抖音、小红书、百家号、主流新闻网站
- 🤖 **AI 智能分析**：基于大语言模型，自动判断情感倾向
- 🚨 **三色预警**：🟢 正常 / 🟡 预警 / 🔴 告警，自动推送通知
- 📝 **专业报告**：自动生成可视化舆情分析报告，支持导出 PDF
- ⏰ **持续监测**：定时自动采集分析，支持自定义刷新频率
- 🔔 **Webhook 通知**：支持飞书、钉钉机器人通知
- 💳 **订阅体系**：免费版/付费版分级服务

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm / yarn / pnpm

### 安装

```bash
# 克隆项目
git clone <repository-url>
cd pulsemind

# 安装依赖
npm install

# 复制环境变量配置
cp .env.example .env

# 编辑 .env，填入你的 OpenAI API Key
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:3000

### Docker 部署

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f
```

访问 http://localhost:3000

## 配置说明

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `JWT_SECRET` | JWT 签名密钥 | pulsemind-secret |
| `OPENAI_API_KEY` | OpenAI API Key | - |
| `OPENAI_BASE_URL` | OpenAI API 地址 | https://api.openai.com/v1 |

### 使用代理（可选）

如果无法直接访问 OpenAI，可以配置代理：

```bash
OPENAI_BASE_URL=https://api.openai.com/v1
# 或者使用代理
OPENAI_BASE_URL=http://your-proxy.com/v1
```

## 订阅方案

| 功能 | 免费版 | 付费版 |
|------|--------|--------|
| 可监测话题数 | 1 个 | 不限 |
| 刷新频率 | 最低 1 小时 | 10 分钟起 |
| 报告保留时间 | 7 天 | 1 年 |
| 飞书/钉钉通知 | ✅ | ✅ |

## 技术栈

- **框架**：Nuxt 3 (Vue 3)
- **样式**：Tailwind CSS
- **数据库**：SQLite (better-sqlite3)
- **AI**：OpenAI SDK
- **爬虫**：Axios + Cheerio
- **认证**：JWT
- **部署**：Docker

## 项目结构

```
pulsemind/
├── server/
│   ├── api/              # API 路由
│   │   ├── auth/         # 认证相关
│   │   ├── topics/       # 话题管理
│   │   ├── reports/      # 报告相关
│   │   └── settings/     # 设置相关
│   ├── utils/            # 工具函数
│   │   ├── db.ts         # 数据库
│   │   ├── auth.ts       # 认证
│   │   ├── openai.ts     # AI 分析
│   │   ├── crawler.ts    # 数据采集
│   │   ├── webhook.ts    # Webhook 通知
│   │   └── report.ts     # 报告生成
│   └── plugins/          # Nuxt 插件
│       └── scheduler.ts  # 定时任务
├── pages/                # 页面
├── components/           # 组件
├── composables/          # 组合式函数
├── assets/               # 静态资源
└── public/               # 公共资源
```

## API 文档

### 认证

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/auth/register` | POST | 注册 |
| `/api/auth/login` | POST | 登录 |
| `/api/auth/me` | GET | 获取当前用户 |

### 话题管理

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/topics` | GET | 获取话题列表 |
| `/api/topics` | POST | 创建话题 |
| `/api/topics/:id` | PUT | 更新话题 |
| `/api/topics/:id` | DELETE | 删除话题 |
| `/api/topics/:id/run` | POST | 手动运行分析 |
| `/api/topics/:id/reports` | GET | 获取报告列表 |

### 报告

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/reports/:id` | GET | 获取报告详情 |
| `/api/reports/:id/download` | GET | 下载报告 |

### 设置

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/settings/webhook` | PUT | 更新 Webhook 配置 |

## 注意事项

1. **合规使用**：数据采集请遵守各平台的服务条款
2. **API 消耗**：AI 分析会产生 OpenAI API 费用，注意控制数据量
3. **安全配置**：生产环境请务必修改 `JWT_SECRET`
4. **数据备份**：定期备份 `data` 目录下的数据库文件

## License

MIT © 2026 PulseMind
