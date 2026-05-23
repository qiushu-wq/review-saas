# 智评助手 · 工作流程文档

> 本文档覆盖项目所有核心工作流程，供 AI 和开发者理解系统架构。

---

## 一、项目结构概览

```
review-saas/
├── ai/                          # AI 工作区（本文档）
├── landing/                     # 落地页 Vue3 SPA
│   ├── src/
│   │   ├── App.vue              # 根组件
│   │   ├── components/          # Hero / Demo / Features / Pricing / Signup
│   │   └── utils/reply-generator.js  # 前端模板引擎（API 降级备用）
│   └── dist/                    # 构建产物
├── browser-extension/           # Chrome/Edge 浏览器扩展
│   ├── manifest.json
│   ├── background/background.js # Service Worker，中转 API 请求
│   └── popup/                   # 弹出面板 UI
├── server/                      # Express 后端
│   ├── index.js                 # 入口，注册路由和中间件
│   ├── config.js                # Railway 环境变量 fallback（临时）
│   ├── db/
│   │   ├── schema.sql           # 数据库表结构
│   │   └── init.js              # sql.js 初始化 + 保存
│   ├── middleware/
│   │   ├── auth.js              # 统一认证中间件（JWT + API Key）
│   │   └── api-auth.js          # [已废弃] 重复中间件
│   ├── routes/
│   │   ├── merchant.js          # 注册/登录/信息管理
│   │   ├── generate.js          # 生成回复/历史记录/统计
│   │   ├── plan.js              # 套餐升级/信息查询
│   │   ├── keys.js              # API Key 管理
│   │   ├── monitor.js           # 评论监控 CRUD
│   │   ├── external.js          # 外部 API（给扩展/第三方用）
│   │   ├── embed.js             # [废弃] 嵌入悬浮按钮
│   │   └── admin.js             # 管理后台
│   ├── lib/
│   │   ├── ai-service.js        # AI 管道：DeepSeek → Claude → 模板
│   │   ├── reply-generator.js   # 模板引擎
│   │   └── reply-templates.js   # 模板库（行业×语气×严重度）
│   └── public/
│       ├── dashboard.html       # 商家后台（Vue3 CDN）
│       ├── admin.html           # 管理员后台
│       └── api-docs.html        # API 外部集成文档
├── marketing-copy.md            # 推广文案
└── README.md
```

---

## 二、认证流程

### 认证中间件 `server/middleware/auth.js`

```
请求到达 → 检查 Authorization: Bearer <token>
  ├── JWT 有效 → 解析 → 设置 req.merchantId → next()
  └── JWT 无效/不存在 → 检查 x-api-key 头
       ├── API Key 有效 → 查 api_keys 表 → 更新 last_used_at → req.merchantId → next()
       └── 都无效 → 401
```

两种认证方式：
- **JWT Token**: 商家后台登录后获取，有效期 7 天
- **API Key**: 在后台生成，给浏览器扩展或第三方系统用

### 浏览器扩展认证（浏览器扩展 → API）

```
popup.js → chrome.storage.sync 存 API Key
         → fetch(API_BASE + '/generate') with x-api-key header
         → auth.js 验证 API Key → 生成回复
```

---

## 三、AI 回复生成管道

`server/lib/ai-service.js`

```
generateReplyWithFallback()
  ├── 1. DeepSeek API（首选，20s 超时）
  │     └── 成功 → 返回 AI 回复
  ├── 2. Claude API（备选，需配置 CLAUDE_API_KEY）
  │     └── 成功 → 返回 AI 回复
  └── 3. 模板引擎（最终降级）
        └── reply-generator.js → reply-templates.js
```

模板引擎结构：`[industry][tone][severity] → { comfort[], verify[], compensate[] }`

行业：catering(餐饮) / ecommerce(电商) / local_service(本地服务)
语气：warm(温暖) / professional(专业) / concise(简洁)
严重度：light / moderate / severe

---

## 四、支付升级流程

```
商家后台点击"升级套餐"
  → POST /api/plan/upgrade { toPlan: "pro"|"enterprise" }
  → 插入 plan_requests 表（status: "pending"）
  → 提示"联系客服付款"

用户联系客服 → 转账 → 告知管理员

管理员后台「升级请求」标签
  → 查看待处理请求列表
  → 点击「通过」→ POST /api/admin/plan-requests/:id/approve
       → 更新 status = "approved"
       → 更新 merchants.plan
       → 更新 merchants.monthly_limit
  → 点击「拒绝」→ POST /api/admin/plan-requests/:id/reject
       → 更新 status = "rejected"
```

套餐：
| 套餐 | 月费 | 条数/月 |
|------|------|---------|
| 免费版 | ¥0 | 50 |
| 专业版 | ¥49 | 500 |
| 企业版 | ¥199 | 无限 |

---

## 五、浏览器扩展架构

Manifest V3，无内容脚本（content_scripts），纯弹出面板。

```
用户点击扩展图标
  → popup/popup.html 弹出
  → 输入差评 + 选择行业/语气
  → popup.js 直接 fetch API（x-api-key 头）
  → 显示生成结果 → 一键复制
```

关键文件：
- `manifest.json`: permissions(storage), host_permissions(Railway API), action(popup)
- `background/background.js`: 原中转 API 请求（不再需要 content_scripts 时废弃，但保留以备用）
- `popup/popup.js`: 界面逻辑，直接调用 `/api/generate`

注意：`popup.js` 直接发 API 请求而不是通过 background.js 中转，因为 popup 生命周期内无 CORS 问题。

---

## 六、评论监控功能

`server/routes/monitor.js` + 商家后台「📡 评论监控」视图

```
商家手动录入差评
  → POST /api/monitor/reviews { platform, reviewContent, severity }
  → 存入 review_monitor 表

商家查看监控列表
  → GET /api/monitor/reviews?status=&platform=&q=&page=
  → 返回分页列表

商家操作：
  └─ 生成回复 → 调用 /api/generate → 填充 generated_reply
  └─ 标记已回复 → PUT /api/monitor/reviews/:id { status: "replied" }
  └─ 删除 → DELETE /api/monitor/reviews/:id

统计概览：
  → GET /api/monitor/stats → { pendingCount, repliedCount, totalCount }
```

功能定位：商家手动复制差评到平台，AI 生成回复，监控跟踪哪些差评已处理。

---

## 七、数据库表关系

```
merchants
  ├── reply_history (1:N)     — 生成历史
  ├── api_keys (1:N)          — API 密钥
  ├── review_monitor (1:N)    — 评论监控
  ├── plan_requests (1:N)     — 升级请求
  └── embed_config (1:1)      — [废弃] 嵌入配置
```

数据库：SQLite（sql.js WASM），数据存 `server/data/` 目录。
每次写操作调用 `saveDb()` 持久化到磁盘。
每月 1 日自动重置 `used_this_month`。

---

## 八、部署架构

```
Railway Docker 部署
  ├── Dockerfile → node:18-alpine
  ├── PORT=3002
  ├── Volume: /app/server/data （持久化 SQLite）
  ├── 自定义域名: https://web-production-3fdc6.up.railway.app
  │
  ├── 商家后台: /dashboard/dashboard.html
  ├── 管理员后台: /admin/admin.html
  ├── API 文档: /api-docs/api-docs.html
  ├── 落地页: /
  └── API: /api/{generate,history,plan,keys,monitor,me,login,register}
```

环境变量（在 Railway Dashboard 设置，config.js 提供 fallback）：
- `JWT_SECRET` — JWT 签名密钥
- `ADMIN_KEY` — 管理员密码
- `DEEPSEEK_API_KEY` — DeepSeek AI API 密钥

---

## 九、关键决策记录

1. **不做自动监控回复** — 产品只做"差评粘贴→AI 生成→复制发布"，非"自动监控并回复"
2. **不做悬浮按钮** — 浏览器扩展通过工具栏图标打开，非页面浮动 widget
3. **sql.js 而非 PostgreSQL** — 简化部署，单个 Docker 容器可运行
4. **DeepSeek 优先** — 国产 API 更稳定便宜，Claude 备选，模板为最终降级
5. **x-api-key 双认证** — auth.js 同时支持 JWT 和 API Key，扩展和第三方系统使用 API Key
6. **Railway V2 环境变量 Bug** — config.js 提供 fallback 值，等待 Railway 修复后移除
