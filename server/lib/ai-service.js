const { generateReply } = require('./reply-generator')

const BASE_SYSTEM_PROMPT = `你叫「小安」，是一个专注于电商和本地生活服务平台的差评回复专家。你的任务是帮商家生成专业、有温度且合规的差评回复。

### 核心原则
1. 永远站在顾客一边 — 不要辩解、不要甩锅、不要反驳
2. 三步流程不可跳过 — 每一步都必须有实质内容
3. 字数控制 — 每条回复总长度 100~300 字（中文）
4. 语气 — 温暖、真诚、专业；使用「您」而非「你」
5. 合规底线 — 不承诺无法兑现的补偿，不诱导修改评价

### 三步生成流程
第一步：情绪安抚 — 先共情，再道歉，确认顾客感受
第二步：原因核实 — 温和确认具体问题点，复述顾客的反馈
第三步：补偿方案 — 阶梯式补偿：轻度优惠券、中度部分退款、重度全额退款+专项跟进

### 禁止
- 「但是」「不过」「可能您误会了」
- 「下次一定改进」「我们会加强管理」
- 空洞表述，必须有具体动作

输出格式：
【情绪安抚】
...
【原因核实】
...
【补偿方案】
...
—— 店铺名`

const INDUSTRY_GUIDE = {
  catering: '商家是餐饮行业，回复应侧重菜品口味、用餐体验、食品安全等方面。',
  ecommerce: '商家是电商行业，回复应侧重商品质量、物流配送、售后服务等方面。',
  local_service: '商家是本地生活服务行业，回复应侧重服务体验、预约流程、效果保障等方面。',
}

const TONE_GUIDE = {
  warm: '语气温暖真诚，多用共情表达，让顾客感受到被理解和重视。',
  professional: '语气专业理性，条理清晰，侧重解决方案而非情感表达。',
  concise: '语言简洁直接，字数控制在 100 字以内，表达高效。',
}

function buildSystemPrompt(options) {
  const industry = options.industry || 'catering'
  const tone = options.tone || 'warm'
  return (INDUSTRY_GUIDE[industry] || '') + '\n' + (TONE_GUIDE[tone] || '')
}

// ─── DeepSeek API ──────────────────────────────
async function generateWithDeepSeek(reviewContent, storeName, productName, options) {
  const { deepseekApiKey } = require('../config')
  const apiKey = process.env.DEEPSEEK_API_KEY || deepseekApiKey
  if (!apiKey) return null

  try {
    const systemPrompt = BASE_SYSTEM_PROMPT + '\n\n' + buildSystemPrompt(options || {})
    const userMessage = '差评内容：' + reviewContent + '\n店铺名称：' + (storeName || '未提供') + '\n商品/服务：' + (productName || '未提供')

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens: 600,
        temperature: 0.7,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('[AI:DeepSeek] API Error:', err)
      return null
    }

    const data = await response.json()
    const replyText = data.choices?.[0]?.message?.content || ''
    if (!replyText) return null

    return {
      steps: parseSteps(replyText),
      severity: detectSeverityFromContent(reviewContent),
      fullText: replyText,
      source: 'ai',
      provider: 'deepseek',
    }
  } catch (err) {
    console.error('[AI:DeepSeek] Error:', err.message)
    return null
  }
}

// ─── Anthropic Claude API (作为备选) ──────────
async function generateWithClaude(reviewContent, storeName, productName, options) {
  const apiKey = process.env.CLAUDE_API_KEY
  if (!apiKey) return null

  try {
    const systemPrompt = BASE_SYSTEM_PROMPT + '\n\n' + buildSystemPrompt(options || {})
    const userMessage = '差评内容：' + reviewContent + '\n店铺名称：' + (storeName || '未提供') + '\n商品/服务：' + (productName || '未提供')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('[AI:Claude] API Error:', err)
      return null
    }

    const data = await response.json()
    const replyText = data.content?.[0]?.text || ''
    if (!replyText) return null

    return {
      steps: parseSteps(replyText),
      severity: detectSeverityFromContent(reviewContent),
      fullText: replyText,
      source: 'ai',
      provider: 'claude',
    }
  } catch (err) {
    console.error('[AI:Claude] Error:', err.message)
    return null
  }
}

function parseSteps(text) {
  const comfort = text.match(/【情绪安抚】\n([\s\S]*?)(?=\n\n【原因核实】|$)/)
  const verify = text.match(/【原因核实】\n([\s\S]*?)(?=\n\n【补偿方案】|$)/)
  const compensate = text.match(/【补偿方案】\n([\s\S]*?)(?=\n\n——|$)/)
  return {
    comfort: comfort ? comfort[1].trim() : '',
    verify: verify ? verify[1].trim() : '',
    compensate: compensate ? compensate[1].trim() : '',
  }
}

function detectSeverityFromContent(text) {
  const severeWords = ['12315', '投诉', '举报', '媒体', '头发', '虫子', '变质', '异物', '中毒']
  const moderateWords = ['态度差', '服务差', '破损', '客服不理', '欺骗', '虚假']
  if (severeWords.some(w => text.includes(w))) return 'severe'
  if (moderateWords.some(w => text.includes(w))) return 'moderate'
  return 'light'
}

// ─── 主入口：DeepSeek 优先 → Claude 备选 → 模板降级 ──
async function generateReplyWithFallback(reviewContent, storeName, productName, options) {
  // 优先 DeepSeek（国内可用，便宜）
  const dsResult = await generateWithDeepSeek(reviewContent, storeName, productName, options)
  if (dsResult) return { ...dsResult, options }

  // 备选 Claude
  const claudeResult = await generateWithClaude(reviewContent, storeName, productName, options)
  if (claudeResult) return { ...claudeResult, options }

  // 最终降级到模板引擎
  const fallback = generateReply(reviewContent, storeName, productName, options)
  return { ...fallback, source: 'template' }
}

module.exports = { generateReplyWithFallback }
