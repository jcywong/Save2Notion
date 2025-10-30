# Save2Notion

一个运行在 Cloudflare Workers 上的服务，可以从文本中提取 URL 并将其保存到 Notion 数据库中，自动获取页面标题。支持处理分享文本、短链接解析等场景。

## 特性

- 🔍 智能 URL 提取：从任意文本中识别并提取第一个有效的 http/https 链接
- 🔄 短链接解析：自动跟踪并解析短链接到最终 URL
- 📑 标题获取：自动获取页面 `<title>` 或 Open Graph 标题
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