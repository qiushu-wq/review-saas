const { Router } = require('express')
const { dbGet, dbAll, dbRun } = require('../db/init')
const { apiAuthMiddleware } = require('../middleware/api-auth')
const { generateReplyWithFallback } = require('../lib/ai-service')

const router = Router()

// POST /api/external/generate
router.post('/external/generate', apiAuthMiddleware, async (req, res) => {
  try {
    const { reviewContent, storeName, productName } = req.body
    if (!reviewContent) return res.status(400).json({ error: '请输入差评内容' })

    const merchant = dbGet('SELECT * FROM merchants WHERE id = ?', [req.merchantId])
    if (!merchant) return res.status(404).json({ error: '商家不存在' })
    if (merchant.used_this_month >= merchant.monthly_limit) {
      return res.status(429).json({ error: '本月使用额度已用完', plan: merchant.plan })
    }

    const result = await generateReplyWithFallback(reviewContent, storeName || merchant.store_name, productName)

    dbRun(
      'INSERT INTO reply_history (merchant_id, review_content, store_name, product_name, generated_reply, severity, source) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.merchantId, reviewContent, storeName || '', productName || '', result.fullText, result.severity, result.source || 'template']
    )
    dbRun('UPDATE merchants SET used_this_month = used_this_month + 1 WHERE id = ?', [req.merchantId])

    res.json({ reply: result.fullText, steps: result.steps, severity: result.severity, source: result.source || 'template' })
  } catch (err) {
    console.error('[External Generate] Error:', err.message)
    res.status(500).json({ error: '生成失败，请稍后再试' })
  }
})

// GET /api/external/history
router.get('/external/history', apiAuthMiddleware, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = 20
    const offset = (page - 1) * limit
    const countResult = dbGet('SELECT COUNT(*) as c FROM reply_history WHERE merchant_id = ?', [req.merchantId])
    const total = countResult ? countResult.c : 0
    const items = dbAll(
      'SELECT id, review_content, store_name, product_name, severity, source, created_at FROM reply_history WHERE merchant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [req.merchantId, limit, offset]
    )
    res.json({ items, total, page, totalPages: Math.ceil(total / limit) || 1 })
  } catch (err) {
    console.error('[External History] Error:', err.message)
    res.status(500).json({ error: '获取历史记录失败' })
  }
})

module.exports = router
