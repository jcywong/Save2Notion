const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')

function loadWorker(overrides = {}) {
    const context = vm.createContext({
        URL,
        console,
        addEventListener: () => {},
        ...overrides
    })
    const source = fs.readFileSync(path.join(__dirname, '..', 'worker.js'), 'utf8')
    vm.runInContext(source, context)
    return context
}

test('常规标题提取兼容 og:title 属性顺序和 HTML 实体', () => {
    const worker = loadWorker()
    const html = `<meta content='Gemini &amp; Cloudflare 实战' property='og:title'>`
    assert.equal(worker.extractStandardTitle(html), 'Gemini & Cloudflare 实战')
})

test('无意义标题会触发兜底', () => {
    const worker = loadWorker()
    assert.equal(worker.isUnusableTitle('Just a moment... | Cloudflare', 'https://example.com'), true)
    assert.equal(worker.isUnusableTitle('example.com', 'https://www.example.com/article'), true)
    assert.equal(worker.isUnusableTitle('如何用 Gemini 生成网页标题', 'https://example.com'), false)
})

test('Gemini 请求启用 URL Context 和 JSON 结构化输出', async () => {
    let capturedUrl = ''
    let capturedRequest = null
    const worker = loadWorker({
        GEMINI_API_KEY: 'test-key',
        GEMINI_MODEL: 'gemini-3.1-pro-preview',
        fetch: async (url, request) => {
            capturedUrl = url
            capturedRequest = request
            return {
                ok: true,
                json: async () => ({
                    candidates: [{ content: { parts: [{ text: JSON.stringify({ title: '“一个有效的测试标题”' }) }] } }]
                })
            }
        }
    })

    const title = await worker.generateTitleWithGemini('https://example.com/article', '<p>页面内容</p>')
    const body = JSON.parse(capturedRequest.body)

    assert.match(capturedUrl, /gemini-3\.1-pro-preview:generateContent$/)
    assert.deepEqual(JSON.parse(JSON.stringify(body.tools)), [{ url_context: {} }])
    assert.equal(body.generationConfig.responseMimeType, 'application/json')
    assert.equal(title, '一个有效的测试标题')
})
