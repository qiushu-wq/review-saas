// 智评助手 — 浮动面板 (在任何页面工作)
(function () {
  // 加载 API key
  let apiKey = ''
  chrome.storage.sync.get(['apiKey'], (data) => {
    if (data.apiKey) apiKey = data.apiKey
  })
  chrome.storage.sync.onChanged.addListener((changes) => {
    if (changes.apiKey) apiKey = changes.apiKey.newValue || ''
  })

  // ---------- 创建 UI ----------
  const container = document.createElement('div')
  container.id = 'zp-assistant'
  container.innerHTML = `
    <div id="zp-toggle">✍️</div>
    <div id="zp-panel">
      <div id="zp-header">
        <span>🤖 智评助手</span>
        <button id="zp-close">✕</button>
      </div>
      <div id="zp-body">
        <textarea id="zp-input" placeholder="粘贴差评原文..." rows="4"></textarea>
        <div id="zp-options">
          <select id="zp-industry">
            <option value="catering">餐饮</option>
            <option value="ecommerce">电商</option>
            <option value="local_service">本地服务</option>
          </select>
          <select id="zp-tone">
            <option value="warm">温暖语气</option>
            <option value="professional">专业语气</option>
            <option value="concise">简洁语气</option>
          </select>
        </div>
        <button id="zp-generate" class="zp-btn">🤖 生成回复</button>
        <div id="zp-loading" style="display:none;">⏳ 生成中...</div>
        <div id="zp-result" style="display:none;">
          <div id="zp-reply-text"></div>
          <button id="zp-copy" class="zp-btn-copy">📋 复制回复</button>
        </div>
        <div id="zp-login-hint" style="display:none;">
          <p>请先在扩展弹窗中配置 API 密钥</p>
        </div>
      </div>
    </div>
  `
  document.body.appendChild(container)

  // ---------- DOM refs ----------
  const toggle = container.querySelector('#zp-toggle')
  const panel = container.querySelector('#zp-panel')
  const closeBtn = container.querySelector('#zp-close')
  const input = container.querySelector('#zp-input')
  const generateBtn = container.querySelector('#zp-generate')
  const loading = container.querySelector('#zp-loading')
  const result = container.querySelector('#zp-result')
  const replyText = container.querySelector('#zp-reply-text')
  const copyBtn = container.querySelector('#zp-copy')
  const loginHint = container.querySelector('#zp-login-hint')

  // ---------- 事件 ----------
  toggle.addEventListener('click', () => {
    panel.classList.toggle('open')
  })

  closeBtn.addEventListener('click', () => {
    panel.classList.remove('open')
  })

  generateBtn.addEventListener('click', async () => {
    const review = input.value.trim()
    if (!review) return

    if (!apiKey) {
      loginHint.style.display = 'block'
      return
    }

    loading.style.display = 'block'
    result.style.display = 'none'
    loginHint.style.display = 'none'
    generateBtn.disabled = true

    try {
      const industry = container.querySelector('#zp-industry').value
      const tone = container.querySelector('#zp-tone').value

      const res = await fetch('https://web-production-3fdc6.up.railway.app/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({ reviewContent: review, industry, tone }),
      })

      if (!res.ok) { const err = await res.json(); throw new Error(err.error || '生成失败') }
      const data = await res.json()
      replyText.textContent = data.reply || data.fullText || ''
      result.style.display = 'block'
    } catch (e) {
      replyText.textContent = '❌ ' + e.message
      result.style.display = 'block'
    } finally {
      loading.style.display = 'none'
      generateBtn.disabled = false
    }
  })

  copyBtn.addEventListener('click', () => {
    const text = replyText.textContent
    if (!text || text.startsWith('❌')) return

    // 先尝试填充页面上的回复框
    const textareas = document.querySelectorAll('textarea')
    let filled = false
    for (const ta of textareas) {
      if (ta !== input && ta.offsetParent !== null && ta.type !== 'hidden') {
        ta.value = text
        ta.dispatchEvent(new Event('input', { bubbles: true }))
        ta.focus()
        filled = true
        break
      }
    }

    // 兜底: 复制到剪贴板
    navigator.clipboard.writeText(text).then(() => {
      copyBtn.textContent = filled ? '✅ 已填入页面' : '✅ 已复制'
      setTimeout(() => { copyBtn.textContent = '📋 复制回复' }, 2000)
    })
  })
})()
