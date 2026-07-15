# Save2Notion

一个运行在 Cloudflare Workers 上的服务，可以从文本中提取 URL 并将其保存到 Notion 数据库中，自动获取页面标题。支持处理分享文本、短链接解析等场景。

## 特性

- 🔍 智能 URL 提取：从任意文本中识别并提取第一个有效的 http/https 链接
- 🔄 短链接解析：自动跟踪并解析短链接到最终 URL
- 📑 标题获取：自动获取页面 `<title>` 或 Open Graph 标题
- ✨ Gemini 兜底：标题缺失或无意义时，总结链接内容并生成中文标题
- 📋 Notion 集成：将 URL 和标题保存到指定的 Notion 数据库
- 🌐 灵活接口：支持 GET 和 POST 请求，便于各种场景使用

## 部署步骤

1. 在 [Cloudflare Dashboard](https://dash.cloudflare.com/) 创建新的 Worker

2. 复制 `worker.js` 内容到 Worker 编辑器

3. 配置环境变量（在 Worker 设置中）：
   ```
   NOTION_API_KEY=your_notion_integration_token
   NOTION_DATABASE_ID=your_database_id
   ```

   可选：如果页面标题无法提取，使用 Gemini Pro 总结内容并生成标题：
   ```
   GEMINI_API_KEY=your_gemini_api_key
   GEMINI_MODEL=gemini-3.1-pro-preview  # 可选，默认值
   GEMINI_TITLE_MAX_CHARS=12000         # 可选，发送给 Gemini 的页面文本上限
   ```

   生产环境建议将 API Key 保存为 Cloudflare Secret，而不是明文变量：
   ```bash
   npx wrangler secret put GEMINI_API_KEY
   ```

4. 保存并部署

## 使用方法

### GET 请求
```bash
# URL 编码的文本，可以是完整 URL 或包含 URL 的长文本
curl "https://your-worker.workers.dev/save?url=这篇文章不错：https://example.com/article 推荐阅读！"
```

### POST 请求（JSON）
```bash
# 发送 JSON 格式数据
curl -X POST "https://your-worker.workers.dev/save" \
  -H "Content-Type: application/json" \
  -d '{"url":"这篇文章不错：https://example.com/article 推荐阅读！"}'
```

### POST 请求（文本）
```bash
# 发送原始文本
curl -X POST "https://your-worker.workers.dev/save" \
  -H "Content-Type: text/plain" \
  -d "这篇文章不错：https://example.com/article 推荐阅读！"
```

## Notion 数据库设置

1. 创建一个新的 Notion 数据库或使用现有数据库
2. 确保数据库包含以下属性：
   - `Name`（标题类型）：存储页面标题
   - `URL`（URL 类型）：存储链接
   - `Tags`（多选类型）：用于分类（可选）
   - `order`（复选框类型）：用于排序/标记（可选）

## 开发

本地测试（需要 Node.js）：
```bash
# 语法检查
node --check worker.js

# 使用 wrangler 本地运行（需要先安装 wrangler）
npm install -g wrangler
wrangler dev
```

## 错误处理

- 400：URL 参数缺失或未找到有效 URL
- 405：不支持的 HTTP 方法（仅支持 GET/POST）
- 500：获取页面标题或保存到 Notion 时出错

## Gemini 标题生成说明

当常规标题为空，或只是 `Untitled`、`Just a moment...`、域名等无意义内容时，Worker 会直接调用 Gemini API。Gemini 会先理解页面文本，再生成不超过 40 个中文字符的标题。

请求同时启用 Gemini URL Context；因此当 Worker 未能抓取到完整 HTML 时，Gemini 仍会尝试直接读取公开链接。需登录、付费墙后的内容或某些反爬站点仍可能无法读取。如果 Gemini 也失败，Worker 会回退到域名标题。

本地开发时可在项目根目录创建不会被 Git 提交的 `.dev.vars`：
```dotenv
NOTION_API_KEY=your_notion_integration_token
NOTION_DATABASE_ID=your_database_id
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.1-pro-preview
```

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！

## 路线图

- [ ] 支持提取多个 URL
- [ ] 添加 URL 验证规则和黑名单
- [ ] 提取更多页面元数据（作者、日期等）
- [ ] 支持自定义 Notion 数据库结构
- [ ] 添加速率限制和访问控制
