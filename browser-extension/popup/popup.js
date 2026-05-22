const API_BASE = 'https://web-production-3fdc6.up.railway.app/api'

const apiKeyInput = document.getElementById('api-key')
const saveKeyBtn = document.getElementById('save-key')
const keyStatus = document.getElementById('key-status')
const reviewInput = document.getElementById('review-input')
const generateBtn = document.getElementById('generate-btn')
const result = document.getElementById('result')
const resultText = document.getElementById('result-text')
const copyBtn = document.getElementById('copy-btn')
const loading = document.getElementById('loading')
const industrySelect = document.getElementById('industry')
const toneSelect = document.getElementById('tone')

// Load saved API key
chrome.storage.sync.get(['apiKey'], (data) => {
  if (data.apiKey) {
    apiKeyInput.value = data.apiKey
    keyStatus.textContent = '✅ 已配置'
    keyStatus.className = 'status ok'
    generateBtn.disabled = false
  }
})

// Save API key
saveKeyBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim()
  if (!key) { keyStatus.textContent = '❌ 请输入 API 密钥'; keyStatus.className = 'status err'; return }
  chrome.storage.sync.set({ apiKey: key }, () => {
    keyStatus.textContent = '✅ 已保存'
    keyStatus.className = 'status ok'
    generateBtn.disabled = false
  })
})

// Enable generate when text is entered
reviewInput.addEventListener('input', () => {
  generateBtn.disabled = !reviewInput.value.trim()
})

// Generate reply
generateBtn.addEventListener('click', async () => {
  const review = reviewInput.value.trim()
  if (!review) return

  chrome.storage.sync.get(['apiKey'], async (data) => {
    if (!data.apiKey) {
      keyStatus.textContent = '❌ 请先配置 API 密钥'
      keyStatus.className = 'status err'
      return
    }

    loading.style.display = 'block'
    result.style.display = 'none'
    generateBtn.disabled = true

    try {
      const res = await fetch(API_BASE + '/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': data.apiKey,
        },
        body: JSON.stringify({
          reviewContent: review,
          industry: industrySelect.value,
          tone: toneSelect.value,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '生成失败')
      }

      const data = await res.json()
      const reply = data.reply || data.fullText || ''
      resultText.textContent = reply
      result.style.display = 'block'
    } catch (e) {
      keyStatus.textContent = '❌ ' + e.message
      keyStatus.className = 'status err'
    } finally {
      loading.style.display = 'none'
      generateBtn.disabled = false
    }
  })
})

// Copy result
copyBtn.addEventListener('click', () => {
  const text = resultText.textContent
  navigator.clipboard.writeText(text).then(() => {
    copyBtn.textContent = '✅ 已复制'
    setTimeout(() => { copyBtn.textContent = '📋 复制' }, 1500)
  })
})
