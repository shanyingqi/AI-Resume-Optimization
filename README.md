# 小单 AI 简历优化

基于 Next.js 的 AI 简历分析与优化工具。支持上传或粘贴简历，结合大模型给出评分、问题诊断、改写建议，并可针对目标岗位 JD 计算匹配度。

## 功能特性

- **简历输入**：粘贴文本，或上传 PDF / DOCX / TXT / MD（最大 5MB）
- **双模式优化**
  - 通用优化：提升专业度、可读性与成果表达
  - JD 定向优化：结合岗位描述，输出匹配度与关键词建议
- **分析报告**：综合评分、问题诊断、改写示例、关键词与求职建议
- **JD 匹配度**：定向模式下显示匹配百分比与说明
- **左右对比**：原文与 AI 完整优化版并排查看，滚动同步
- **导出与复制**：下载优化报告 / 优化版简历，一键复制内容
- **历史记录**：自动保存最近 20 条优化记录，支持恢复与删除
- **草稿保存**：刷新页面可恢复未完成的编辑内容

## 技术栈

- [Next.js 16](https://nextjs.org)（App Router）
- React 19 + TypeScript
- Tailwind CSS 4
- OpenAI 兼容 API（OpenAI / DeepSeek / 通义等）
- [mammoth](https://www.npmjs.com/package/mammoth)（DOCX 解析）
- [unpdf](https://www.npmjs.com/package/unpdf)（PDF 解析）

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

## 项目结构

```
app/
  api/
    optimize/        # 简历 AI 优化
    parse-resume/    # PDF / DOCX 解析
  components/
    ResumeOptimizer.tsx    # 主页面逻辑
    ResumeUploader.tsx     # 文件上传
    OptimizeResultPanel.tsx
    ComparePanel.tsx       # 左右对比
    HistoryPanel.tsx       # 历史记录
lib/
  ai/client.ts             # 大模型调用
  prompts/optimize-resume.ts
  resume/
    parse-server.ts        # 服务端文档解析
    history.ts             # 历史记录
    export-report.ts       # 报告导出
    samples.ts             # 填入示例用的演示数据
  types/resume.ts
```
