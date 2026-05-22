const { Router } = require('express')
const { dbGet, dbAll, dbRun } = require('../db/init')
const { authMiddleware } = require('../middleware/auth')
const { generateReplyWithFallback } = require('../lib/ai-service')
const { generateReply } = require('../lib/reply-generator')

const router = Router()

// POST /api/demo/generate — 公开演示，无需登录
router.post('/demo/generate', async (req, res) => {
  try {
    const { reviewContent, storeName, productName, industry, tone } = req.body
    if (!reviewContent) return res.status(400).json({ error: '请输入差评内容' })
    const result = await generateReplyWithFallback(reviewContent, storeName || '', productName || '', { industry, tone })
    res.json({
      reply: result.fullText,
      steps: result.steps,
      severity: result.severity,
      severityLabel: result.severityLabel,
      source: result.source || 'template',
    })
  } catch (err) {
    console.error('[Demo Generate] Error:', err.message)
    res.status(500).json({ error: '生成失败，请稍后再试' })
  }
})

// POST /api/generate
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { reviewContent, storeName, productName, industry, tone } = req.body
    if (!reviewContent) return res.status(400).json({ error: '请输入差评内容' })

    const merchant = dbGet('SELECT * FROM merchants WHERE id = ?', [req.merchantId])
    if (!merchant) return res.status(404).json({ error: '商家不存在' })

    // Auto-reset monthly usage if a new month has started
    const now = new Date()
    const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
    if (!merchant.reset_date || merchant.reset_date.slice(0, 7) !== currentMonth) {
      dbRun('UPDATE merchants SET used_this_month = 0, reset_date = ? WHERE id = ?', [now.toISOString().slice(0, 10), req.merchantId])
      merchant.used_this_month = 0
      merchant.reset_date = now.toISOString().slice(0, 10)
    }

    if (merchant.used_this_month >= merchant.monthly_limit) {
      return res.status(429).json({ error: '本月使用额度已用完，请升级套餐', plan: merchant.plan })
    }

    const result = await generateReplyWithFallback(reviewContent, storeName || merchant.store_name, productName, { industry, tone })

    dbRun(
      'INSERT INTO reply_history (merchant_id, review_content, store_name, product_name, generated_reply, severity, source) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.merchantId, reviewContent, storeName || '', productName || '', result.fullText, result.severity, result.source || 'template']
    )

    dbRun('UPDATE merchants SET used_this_month = used_this_month + 1 WHERE id = ?', [req.merchantId])

    res.json({
      reply: result.fullText,
      steps: result.steps,
      severity: result.severity,
      source: result.source || 'template',
    })
  } catch (err) {
    console.error('[Generate] Error:', err.message)
    res.status(500).json({ error: '生成失败，请稍后再试' })
  }
})

// GET /api/history (with search & filter)
router.get('/history', authMiddleware, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = 20
    const offset = (page - 1) * limit

    let whereClause = 'WHERE merchant_id = ?'
    let params = [req.merchantId]

    if (req.query.q) {
      whereClause += ' AND review_content LIKE ?'
      params.push('%' + req.query.q + '%')
    }
    if (req.query.severity) {
      whereClause += ' AND severity = ?'
      params.push(req.query.severity)
    }

    const countResult = dbGet(`SELECT COUNT(*) as c FROM reply_history ${whereClause}`, params)
    const total = countResult ? countResult.c : 0

    const items = dbAll(
      `SELECT id, review_content, store_name, product_name, severity, source, created_at FROM reply_history ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    )

    res.json({ items, total, page, totalPages: Math.ceil(total / limit) || 1 })
  } catch (err) {
    console.error('[History] Error:', err.message)
    res.status(500).json({ error: '获取历史记录失败' })
  }
})

// GET /api/history/:id
router.get('/history/:id', authMiddleware, (req, res) => {
  try {
    const item = dbGet(
      'SELECT * FROM reply_history WHERE id = ? AND merchant_id = ?',
      [req.params.id, req.merchantId]
    )
    if (!item) return res.status(404).json({ error: '记录不存在' })
    res.json(item)
  } catch (err) {
    console.error('[History Detail] Error:', err.message)
    res.status(500).json({ error: '获取记录失败' })
  }
})

// GET /api/stats
router.get('/stats', authMiddleware, (req, res) => {
  try {
    const merchant = dbGet(
      'SELECT plan, monthly_limit, used_this_month, created_at FROM merchants WHERE id = ?',
      [req.merchantId]
    )
    const countResult = dbGet('SELECT COUNT(*) as c FROM reply_history WHERE merchant_id = ?', [req.merchantId])
    const totalUsed = countResult ? countResult.c : 0

    const todayStart = new Date().toISOString().slice(0, 10)
    const todayUsedResult = dbGet(
      "SELECT COUNT(*) as c FROM reply_history WHERE merchant_id = ? AND date(created_at) = ?",
      [req.merchantId, todayStart]
    )

    const severityCounts = dbAll(
      'SELECT severity, COUNT(*) as c FROM reply_history WHERE merchant_id = ? GROUP BY severity',
      [req.merchantId]
    )

    const daysSinceStart = Math.max(1, Math.ceil(
      (Date.now() - new Date(merchant.created_at).getTime()) / (1000 * 60 * 60 * 24)
    ))

    res.json({
      plan: merchant.plan,
      monthlyLimit: merchant.monthly_limit,
      usedThisMonth: merchant.used_this_month,
      remaining: Math.max(0, merchant.monthly_limit - merchant.used_this_month),
      totalUsed,
      usageBySeverity: Object.fromEntries(severityCounts.map(s => [s.severity, s.c])),
      todayUsed: todayUsedResult ? todayUsedResult.c : 0,
      averageDaily: (totalUsed / daysSinceStart).toFixed(1),
    })
  } catch (err) {
    console.error('[Stats] Error:', err.message)
    res.status(500).json({ error: '获取统计数据失败' })
  }
})

// DELETE /api/history/:id
router.delete('/history/:id', authMiddleware, (req, res) => {
  try {
    const item = dbGet('SELECT id FROM reply_history WHERE id = ? AND merchant_id = ?', [req.params.id, req.merchantId])
    if (!item) return res.status(404).json({ error: '记录不存在' })
    dbRun('DELETE FROM reply_history WHERE id = ?', [req.params.id])
    res.json({ message: '删除成功' })
  } catch (err) {
    console.error('[History Delete] Error:', err.message)
    res.status(500).json({ error: '删除失败' })
  }
})

module.exports = router
