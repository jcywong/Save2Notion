addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
})


async function handleRequest(request) {
    if (request.method !== 'GET') {
        return new Response('Only GET requests are allowed.', { status: 405 })
    }

    const url = new URL(request.url)
    let targetText = url.searchParams.get('url')
    console.log("Raw input:", targetText)

    if (!targetText) {
        return new Response('URL parameter is missing.', { status: 400 })
    }

    // 从文本中提取 http/https 链接
    const urlRegex = /(https?:\/\/[^\s]+)/gi
    const match = targetText.match(urlRegex)
    if (!match || match.length === 0) {
        return new Response('No valid URL found in input.', { status: 400 })
    }

    // 默认取第一个 URL
    let targetUrl = match[0].trim()
    console.log("Extracted URL:", targetUrl)

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
