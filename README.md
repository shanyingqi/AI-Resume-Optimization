# 小单 AI 简历优化

基于 Next.js 的 AI 简历分析与优化工具。支持上传或粘贴简历，结合大模型给出评分、问题诊断、改写建议，并可针对目标岗位 JD 计算匹配度。登录后数据持久化到 MySQL，支持 AI 对话与历史记录云端同步。

## 功能特性

### 简历优化

- **简历输入**：粘贴文本，或上传 PDF / DOCX / TXT / MD（单文件最大 5MB）
- **字数限制**：简历最多 12,000 字，岗位 JD 最多 6,000 字（前后端双重校验）
- **双模式优化**
  - 通用优化：提升专业度、可读性与成果表达
  - JD 定向优化：结合岗位描述，输出匹配度与关键词建议
- **流式分析**：SSE 分步反馈进度，支持中途取消
- **分析报告**：综合评分、问题诊断、改写示例、关键词与求职建议
- **JD 匹配度**：定向模式下显示匹配百分比与说明
- **左右对比**：原文与优化版并排查看，差异高亮（删除标红 / 新增标绿），滚动同步
- **简历模板预览**：AI 输出结构化简历，支持三种模板实时预览
  - 简约单栏、现代顶栏、侧栏布局
  - 模板选择会随历史记录一并保存
- **简历导出**：基于模板导出矢量 PDF 或 Word，导出失败弹窗提示
- **报告 / 求职信导出**：分析报告与求职信支持 PDF / Word 文本下载
- **求职信生成**：定向优化完成后，基于同一简历 + JD 一键生成 Cover Letter
- **应用优化版**：一键将优化结果写回编辑区，继续修改或再次优化
- **历史记录**：登录后保存优化记录到数据库，支持恢复与删除
- **草稿保存**：刷新页面可恢复未完成的编辑内容

### 账号与对话

- **邮箱注册 / 登录**：bcrypt 加密密码，JWT 写入 HttpOnly Cookie
- **找回密码**：开发环境可在 `/forgot-password` 获取重置链接
- **AI 对话**：首页为新对话，支持多轮聊天与附件
- **会话管理**：侧边栏查看、切换、删除历史会话
- **账号设置**：修改昵称、上传头像、查看本月用量、退出登录

### 二期：求职工作流

- **主简历**：保存一份主简历，进入优化页可一键载入
- **求职项目**：按岗位管理 JD、优化记录与相关对话（`/projects`）
- **历史增强**：自定义标题、搜索、软删除（上限 50 条）
- **对话 ↔ 优化打通**：优化后可继续对话；对话中可跳转优化；历史记录可「继续对话」
- **新用户引导**：首次登录引导设置主简历
- **用户级用量**：登录用户按月度额度限流（设置页可查看）

### 其他

- **接口限流**：未登录按 IP 限流；登录用户按月度用量限额

## 技术栈

- [Next.js 16](https://nextjs.org)（App Router）
- React 19 + TypeScript
- Tailwind CSS 4
- [Prisma 6](https://www.prisma.io) + MySQL（`@prisma/adapter-mariadb` 驱动适配器）
- OpenAI 兼容 API（OpenAI / DeepSeek / 通义等）
- [mammoth](https://www.npmjs.com/package/mammoth)（DOCX 解析）
- [unpdf](https://www.npmjs.com/package/unpdf)（PDF 解析）
- [@react-pdf/renderer](https://react-pdf.org) + [pdf-lib](https://pdf-lib.js.org)（简历矢量 PDF 导出）
- [docx](https://www.npmjs.com/package/docx)（简历 / 报告 Word 导出）
- [html2canvas](https://www.npmjs.com/package/html2canvas) + [jspdf](https://www.npmjs.com/package/jspdf)（报告文本 PDF 导出）

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

在项目根目录创建 `.env`（Prisma CLI 读取此文件，不要用 `.env.local` 替代）：

```env
# MySQL 连接串（本地或 Railway 公网地址）
DATABASE_URL="mysql://user:password@host:port/database"

# 认证密钥（至少 32 位随机字符串）
AUTH_SECRET="your_random_secret_at_least_32_chars"

# 大模型 API
OPENAI_API_KEY=你的_API_Key

# 可选：使用 DeepSeek
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-chat
```

未配置 `OPENAI_API_KEY` 时，优化与对话功能将无法使用。

### 3. 初始化数据库

**使用 Railway MySQL（推荐生产环境）**

1. 在 [Railway](https://railway.app) 创建 MySQL 服务
2. 打开 MySQL → **Variables**，复制 `MYSQL_PUBLIC_URL`（公网地址，含端口）
3. 写入 `.env` 的 `DATABASE_URL`
4. 同步表结构：

```bash
npm run db:push
```

> **注意**：在 Windows 上连接 Railway 公网 MySQL 时，`npx prisma db push` 可能因 SSL 兼容问题报 `P1001`。请使用项目自带的 `npm run db:push`（通过 `scripts/db-push-railway.mjs` 推送 schema）。连接本地 MySQL 时可直接使用 `npm run db:push:prisma`。

**使用本地 MySQL**

确保 MySQL 版本 ≥ 8.0，然后：

```bash
npm run db:push:prisma
```

### 4. 启动开发服务器

```bash
npm run dev
```

浏览器访问 [http://localhost:3000](http://localhost:3000)，首次使用需注册账号。

### 5. 生产构建

```bash
npm run build
npm start
```

## 部署到 Vercel

在 Vercel 项目 **Settings → Environment Variables** 中配置：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | Railway 的 `MYSQL_PUBLIC_URL`（完整连接串） |
| `AUTH_SECRET` | 与本地相同的随机密钥（至少 32 位） |
| `OPENAI_API_KEY` | 大模型 API Key |
| `OPENAI_BASE_URL` | 可选，如 DeepSeek 地址 |
| `OPENAI_MODEL` | 可选，如 `deepseek-chat` |

部署前请先在 Railway 上执行 `npm run db:push` 完成建表。Vercel 构建命令为 `prisma generate && next build`（已在 `package.json` 中配置）。

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生成 Prisma Client 并构建生产包 |
| `npm run db:push` | 推送 schema 到数据库（兼容 Railway 公网） |
| `npm run db:push:prisma` | 使用 Prisma CLI 直接推送（适合本地 MySQL） |
| `npm run db:generate` | 仅生成 Prisma Client |
| `npm run db:migrate` | 创建并应用迁移（开发用） |

## 路由说明

| 路径 | 说明 |
|------|------|
| `/` | AI 新对话（默认首页） |
| `/resume` | 简历优化 |
| `/projects` | 求职项目列表 |
| `/projects/[id]` | 求职项目详情 |
| `/chat/[sessionId]` | 已有对话会话 |
| `/login` | 登录 / 注册 |
| `/forgot-password` | 找回密码 |
| `/reset-password` | 重置密码 |

## 接口限流说明

| 接口 | 默认限制 |
|------|----------|
| `POST /api/optimize` | 每 IP 每小时 10 次 |
| `POST /api/parse-resume` | 每 IP 每小时 30 次 |
| `POST /api/cover-letter` | 每 IP 每小时 10 次 |

超出限制返回 `429`，响应头包含 `Retry-After`。当前为内存计数，**多实例部署需改用 Redis 等共享存储**。

限流阈值可在 `lib/resume/constants.ts` 中调整。

## 项目结构

```
app/
  (auth)/login/            # 登录 / 注册页
  (main)/                  # 需登录的主界面（含侧边栏）
    page.tsx               # AI 新对话
    resume/page.tsx        # 简历优化
    chat/[sessionId]/      # 对话会话
  api/
    auth/                  # 注册、登录、登出、用户信息
    chat/                  # 对话流式接口与会话 CRUD
    history/               # 优化历史记录 CRUD
    optimize/              # 简历 AI 优化（SSE 流式）
    cover-letter/          # 求职信生成
    parse-resume/          # PDF / DOCX 解析
  components/
    AppSidebar.tsx         # 侧边栏（会话列表、导航）
    ChatPanel.tsx          # AI 对话面板
    UserMenu.tsx           # 右上角用户菜单
    AccountSettingsModal.tsx
    ResumeOptimizer.tsx    # 简历优化主逻辑
    HistoryPanel.tsx       # 历史记录
    ...
lib/
  auth/                    # 密码、JWT Session、鉴权
  db/                      # Prisma 客户端与数据映射
  chat/                    # 对话会话客户端 API
  ai/                      # 大模型调用
  resume/                  # 简历解析、导出、历史
  prompts/                 # Prompt 模板
prisma/
  schema.prisma            # 数据模型（User、History、ChatSession 等）
scripts/
  db-push-railway.mjs      # Railway 兼容的 schema 推送脚本
middleware.ts              # 路由鉴权（除 /login 与 /api/auth/*）
```

## 数据模型

- **User**：用户账号（邮箱、密码哈希、昵称、头像、引导状态）
- **ResumeProfile**：主简历
- **ResumeVersion**：简历版本快照
- **JobApplication**：求职项目
- **OptimizationHistory**：简历优化历史（可关联项目）
- **ChatSession**：AI 对话会话（可关联项目与优化记录）
- **ChatMessage**：对话消息
- **UsageEvent**：用户月度用量统计

详见 `prisma/schema.prisma`。
