# 小单 AI 简历优化

基于 Next.js 的 AI 简历分析与优化工具。支持上传或粘贴简历，结合大模型给出评分、问题诊断、改写建议，并可针对目标岗位 JD 计算匹配度。

## 功能特性

- **简历输入**：粘贴文本，或上传 PDF / DOCX / TXT / MD（单文件最大 5MB）
- **字数限制**：简历最多 12,000 字，岗位 JD 最多 6,000 字（前后端双重校验）
- **双模式优化**
  - 通用优化：提升专业度、可读性与成果表达
  - JD 定向优化：结合岗位描述，输出匹配度与关键词建议
- **流式分析**：SSE 分步反馈进度，支持中途取消
- **分析报告**：综合评分、问题诊断、改写示例、关键词与求职建议
- **JD 匹配度**：定向模式下显示匹配百分比与说明
- **左右对比**：原文与优化版并排查看，差异高亮（删除标红 / 新增标绿），滚动同步
- **求职信生成**：定向优化完成后，基于同一简历 + JD 一键生成 Cover Letter
- **应用优化版**：一键将优化结果写回编辑区，继续修改或再次优化
- **导出**：支持 PDF / Word 下载，导出失败弹窗提示
- **历史记录**：自动保存最近 20 条优化记录，支持恢复与删除
- **草稿保存**：刷新页面可恢复未完成的编辑内容
- **接口限流**：按 IP 限制优化与文件解析频率，防止 API Key 被滥用

## 技术栈

- [Next.js 16](https://nextjs.org)（App Router）
- React 19 + TypeScript
- Tailwind CSS 4
- OpenAI 兼容 API（OpenAI / DeepSeek / 通义等）
- [mammoth](https://www.npmjs.com/package/mammoth)（DOCX 解析）
- [unpdf](https://www.npmjs.com/package/unpdf)（PDF 解析）
- [docx](https://www.npmjs.com/package/docx) + [jspdf](https://www.npmjs.com/package/jspdf)（报告导出）

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

在项目根目录创建 `.env.local`：

```env
OPENAI_API_KEY=你的_API_Key

# 可选：使用 DeepSeek
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-chat
```

未配置 `OPENAI_API_KEY` 时，优化功能将无法使用。

### 3. 启动开发服务器

```bash
npm run dev
```

浏览器访问 [http://localhost:3000](http://localhost:3000)。

### 4. 生产构建

```bash
npm run build
npm start
```

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
  api/
    optimize/              # 简历 AI 优化（SSE 流式）
    cover-letter/          # 求职信生成
    parse-resume/          # PDF / DOCX 解析
  components/
    ResumeOptimizer.tsx    # 主页面逻辑
    ResumeUploader.tsx     # 文件上传
    OptimizeResultPanel.tsx
    OptimizeLoadingPanel.tsx
    ComparePanel.tsx       # 左右对比 + 差异高亮
    CoverLetterPanel.tsx   # 求职信生成
    DownloadButton.tsx     # PDF / Word 导出
    ExportOverlay.tsx      # 导出全屏遮罩
    AppModal.tsx           # 确认 / 错误弹窗
    HistoryPanel.tsx       # 历史记录
lib/
  ai/
    client.ts              # 大模型调用（支持 abort）
    stream-events.ts       # SSE 事件类型
  api/
    rate-limit.ts          # IP 频率限制
  prompts/
    optimize-resume.ts
    cover-letter.ts
  resume/
    parse-server.ts        # 服务端文档解析
    history.ts             # 历史记录
    export-report.ts       # 报告文本格式化
    export-document.ts     # PDF / Word 导出
    optimize-stream.ts     # 客户端 SSE 消费
    text-diff.ts           # 行级差异对比
    validate.ts            # 字数校验
    constants.ts
  types/resume.ts
```
