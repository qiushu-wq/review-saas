const { Router } = require('express')
const { dbGet, dbAll, dbRun } = require('../db/init')
const { authMiddleware } = require('../middleware/auth')

const router = Router()

// GET /api/monitor/reviews
router.get('/monitor/reviews', authMiddleware, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = 20
    const offset = (page - 1) * limit

    let where = 'WHERE merchant_id = ?'
    const params = [req.merchantId]

    if (req.query.status) {
      where += ' AND status = ?'
      params.push(req.query.status)
    }
    if (req.query.platform) {
      where += ' AND platform = ?'
      params.push(req.query.platform)
    }
    if (req.query.q) {
      where += ' AND review_content LIKE ?'
      params.push('%' + req.query.q + '%')
    }

    const countResult = dbGet(`SELECT COUNT(*) as c FROM review_monitor ${where}`, params)
    const total = countResult ? countResult.c : 0

    const items = dbAll(
      `SELECT * FROM review_monitor ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    )

    res.json({ items, total, page, totalPages: Math.ceil(total / limit) || 1 })
  } catch (err) {
    console.error('[Monitor List] Error:', err.message)
    res.status(500).json({ error: '获取评论列表失败' })
  }
})

// POST /api/monitor/reviews
router.post('/monitor/reviews', authMiddleware, (req, res) => {
  try {
    const { reviewContent, platform, severity } = req.body
    if (!reviewContent) return res.status(400).json({ error: '请输入评论内容' })

    const result = dbRun(
      'INSERT INTO review_monitor (merchant_id, review_content, platform, severity) VALUES (?, ?, ?, ?)',
      [req.merchantId, reviewContent, platform || '', severity || 'light']
    )

    dbRun('UPDATE merchants SET last_checked_at = datetime("now") WHERE id = ?', [req.merchantId])

    res.status(201).json({ id: result.lastInsertRowid, message: '添加成功' })
  } catch (err) {
    console.error('[Monitor Create] Error:', err.message)
    res.status(500).json({ error: '添加失败' })
  }
})

// PUT /api/monitor/reviews/:id
router.put('/monitor/reviews/:id', authMiddleware, (req, res) => {
  try {
    const item = dbGet('SELECT id FROM review_monitor WHERE id = ? AND merchant_id = ?', [req.params.id, req.merchantId])
    if (!item) return res.status(404).json({ error: '记录不存在' })

    const { status, generatedReply, platform, severity } = req.body
    const updates = []
    const params = []

    if (status) {
      updates.push('status = ?')
      params.push(status)
      if (status === 'replied') {
        updates.push('replied_at = datetime("now")')
      }
    }
    if (generatedReply !== undefined) {
      updates.push('generated_reply = ?')
      params.push(generatedReply)
    }
    if (platform !== undefined) {
      updates.push('platform = ?')
      params.push(platform)
    }
    if (severity !== undefined) {
      updates.push('severity = ?')
      params.push(severity)
    }
    if (updates.length === 0) return res.status(400).json({ error: '没有要更新的字段' })

    params.push(req.params.id)
    dbRun(`UPDATE review_monitor SET ${updates.join(', ')} WHERE id = ?`, params)
    dbRun('UPDATE merchants SET last_checked_at = datetime("now") WHERE id = ?', [req.merchantId])

    res.json({ message: '更新成功' })
  } catch (err) {
    console.error('[Monitor Update] Error:', err.message)
    res.status(500).json({ error: '更新失败' })
  }
})

// DELETE /api/monitor/reviews/:id
router.delete('/monitor/reviews/:id', authMiddleware, (req, res) => {
  try {
    const item = dbGet('SELECT id FROM review_monitor WHERE id = ? AND merchant_id = ?', [req.params.id, req.merchantId])
    if (!item) return res.status(404).json({ error: '记录不存在' })
    dbRun('DELETE FROM review_monitor WHERE id = ?', [req.params.id])
    res.json({ message: '删除成功' })
  } catch (err) {
    console.error('[Monitor Delete] Error:', err.message)
    res.status(500).json({ error: '删除失败' })
  }
})

// GET /api/monitor/stats
router.get('/monitor/stats', authMiddleware, (req, res) => {
  try {
    const pending = dbGet('SELECT COUNT(*) as c FROM review_monitor WHERE merchant_id = ? AND status = ?', [req.merchantId, 'pending'])
    const replied = dbGet('SELECT COUNT(*) as c FROM review_monitor WHERE merchant_id = ? AND status = ?', [req.merchantId, 'replied'])
    const merchant = dbGet('SELECT last_checked_at FROM merchants WHERE id = ?', [req.merchantId])

    res.json({
      pendingCount: pending ? pending.c : 0,
      repliedCount: replied ? replied.c : 0,
      totalCount: (pending ? pending.c : 0) + (replied ? replied.c : 0),
      lastCheckedAt: merchant ? merchant.last_checked_at : null,
    })
  } catch (err) {
    console.error('[Monitor Stats] Error:', err.message)
    res.status(500).json({ error: '获取统计失败' })
  }
})

module.exports = router
