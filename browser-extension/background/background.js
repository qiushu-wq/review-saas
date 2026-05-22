// 智评助手 — 后台脚本（处理 API 请求，绕过 CORS 限制）
const API_BASE = 'https://web-production-3fdc6.up.railway.app/api'

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'generate') {
    const { reviewContent, industry, tone, apiKey } = request
    fetch(API_BASE + '/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ reviewContent, industry, tone }),
      signal: AbortSignal.timeout(15000),
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || '生成失败')
        }
        return res.json()
      })
      .then((data) => sendResponse({ ok: true, data }))
      .catch((err) => sendResponse({ ok: false, error: err.message }))
    return true // keep message channel open for async response
  }
})
