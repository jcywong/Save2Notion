addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
})


async function handleRequest(request) {
    // 支持 GET 和 POST：
    // - GET: 使用 query 参数 url（短文本或直接 URL）
    // - POST: 支持 application/json（{ url: "..." }）或 text/plain（原文）
    if (request.method !== 'GET' && request.method !== 'POST') {
        return new Response('Only GET and POST requests are allowed.', { status: 405 })
    }

    let targetText = null

    if (request.method === 'GET') {
        const url = new URL(request.url)
        targetText = url.searchParams.get('url')
    } else if (request.method === 'POST') {
        const contentType = request.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
            try {
                const body = await request.json()
                // 允许 client 把大段文字放在 body.url 中
                targetText = body && body.url ? body.url : null
            } catch (e) {
                // 解析失败，尝试原始文本
                targetText = await request.text()
            }
        } else {
            // text/plain 或其他类型，直接读取为文本
            targetText = await request.text()
        }
    }

    console.log('Raw input:', targetText)

    if (!targetText) {
        return new Response('URL parameter is missing.', { status: 400 })
    }

    // 从文本中提取第一个 http/https 链接（更鲁棒，去除尾部标点）
    const targetUrl = extractFirstUrl(String(targetText))
    if (!targetUrl) {
        return new Response('No valid URL found in input.', { status: 400 })
    }
    console.log('Extracted URL:', targetUrl)

    try {
        // 跟踪短链接重定向（自动获取最终 URL）
        const resolvedUrl = await resolveRedirect(targetUrl)
        console.log("Resolved URL:", resolvedUrl)

        // 获取网页标题
        const response = await fetch(resolvedUrl)
        if (!response.ok) {
            throw new Error('Failed to fetch URL: ' + response.status)
        }

        const html = await response.text()

        // 提取 <title> 或 og:title
        let titleMatch = html.match(/<title>(.*?)<\/title>/i)
        let title = titleMatch ? titleMatch[1].trim() : null

        if (!title) {
            const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]*)"/i)
            title = ogTitleMatch ? ogTitleMatch[1].trim() : 'Title not found'
        }

        console.log("Page title:", title)

        // 推送到 Notion
        await sendToNotion(title, resolvedUrl)

        return new Response(title, { status: 200 })
    } catch (error) {
        console.error("Error:", error)
        return new Response('Error fetching URL.', { status: 500 })
    }
}

/**
 * 解析短链接并返回最终跳转的 URL
 */
async function resolveRedirect(url) {
    try {
        // 发起 HEAD 请求，不下载整个页面
        const response = await fetch(url, {
            method: 'HEAD',
            redirect: 'follow'
        })
        return response.url
    } catch (e) {
        // 某些短链拒绝 HEAD，可尝试 GET
        const response = await fetch(url, {
            method: 'GET',
            redirect: 'follow'
        })
        return response.url
    }
}


/**
 * 从任意文本中提取第一个 http/https URL，去除常见尾随标点，并验证 URL 构造器。
 * 返回字符串或 null
 */
function extractFirstUrl(text) {
    if (!text) return null
    // 排除空白和常见分隔符（包含中文标点）
    const urlRegex = /https?:\/\/[^[\s"'<>，。、）)\]}]+/gi
    const matches = String(text).match(urlRegex)
    if (!matches || matches.length === 0) return null

    for (let m of matches) {
        // 去掉结尾可能夹带的标点（英文/中文/右括号等）
        let cleaned = m.replace(/[)\]}>，。、,.!?"'：;]+$/u, '')
        try {
            // 验证是否为合法 URL
            const u = new URL(cleaned)
            if (u.protocol === 'http:' || u.protocol === 'https:') {
                return cleaned
            }
        } catch (e) {
            // 如果不合法，尝试下一个匹配
            continue
        }
    }

    return null
}




async function sendToNotion(title, url) {
    try {

        console.log(title,url)
        const newData = {
            parent: {
                //   database_id: "YOUR_DATABASE_ID"
                "database_id": "9cff000d-5c24-4072-8a29-2af2f0a997d5"

            },
            "properties": {
                "order": {
                    "checkbox": false
                },
                "URL": {
                    "url": url
                },
                "Tags": {
                    "multi_select": []
                },
                "Name": {
                    "title": [
                        {
                            "text": {
                                "content": title
                            }
                        }
                    ]
                }
            },
            "children": [
                {
                    "object": "block",
                    "bookmark": {
                        "caption": [],
                        "url": url
                    }
                }
            ]
        }

        const notionApiUrl = 'https://api.notion.com/v1/pages'

        // 发送 POST 请求到 Notion API
        const response = await fetch(notionApiUrl, {
            method: 'POST',
            headers: {
                //   'Authorization': 'Bearer YOUR_NOTION_API_KEY',
                'Content-Type': 'application/json',
                'Notion-Version': '2022-06-28'
            },
            body: JSON.stringify(newData)
        })

        // 返回 Notion API 的响应
        console.log(response)
        return response
    } catch (error) {
        // 处理错误情况
        return new Response('Error occurred: ' + error.message, { status: 500 })
    }
}
