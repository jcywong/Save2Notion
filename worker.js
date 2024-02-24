addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
    // 检查请求方法是否为 GET
    if (request.method !== 'GET') {
        return new Response('Only GET requests are allowed.', { status: 405 })
    }

    // 从请求的 URL 中获取要获取标题的 URL
    const url = new URL(request.url)
    const targetUrl = url.searchParams.get('url')
    console.log(targetUrl)

    // 如果 URL 为空，则返回错误
    if (!targetUrl) {
        return new Response('URL parameter is missing.', { status: 400 })
    }

    try {
        // 发起对目标 URL 的 GET 请求
        const response = await fetch(targetUrl)

        if (!response.ok) {
            throw new Error('Failed to fetch URL: ' + response.status)
          }
      

        // 从响应中提取 HTML 内容
        const html = await response.text()


        // 从 HTML 中提取标题
        const titleMatch = html.match(/<title>(.*?)<\/title>/i)
        let title = titleMatch ? titleMatch[1] : 'Title not found'
        
        //微信公众号获取标题
        if (!title) {
            const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]*)" \/>/i)
            title = ogTitleMatch ? ogTitleMatch[1] : null
          }
        console.log(title)
        // 将标题发送到 Notion API
        await sendToNotion(title, targetUrl)

        // 返回标题
        return new Response(title, { status: 200 })
    } catch (error) {
        // 处理异常情况
        return new Response('Error fetching URL.', { status: 500 })
    }
}



async function sendToNotion(title, url) {
    try {
        const newData = {
            parent: {
                //   database_id: "YOUR_DATABASE_ID"
                "database_id": "xxxxxxxxxxxxxxxxxxxxxx"

            },
            // properties:"YOUR_properties" 
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
                'Authorization': 'Bearer secret_xxxxxxxxxx',
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
