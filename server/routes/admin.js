const { Router } = require('express')
const { dbGet, dbAll, dbRun } = require('../db/init')

const router = Router()

const { adminKey: configAdminKey } = require('../config')
const ADMIN_KEY = process.env.ADMIN_KEY || configAdminKey || 'admin123'

// Admin key auth middleware
function adminAuth(req, res, next) {
  const key = req.headers['x-admin-key']
  if (!key || key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized: invalid or missing admin key' })
  }
  next()
}

const PLAN_LIMITS = { free: 50, pro: 500, enterprise: 99999 }

// GET /api/admin/merchants — list all merchants
router.get('/admin/merchants', adminAuth, (req, res) => {
  try {
    const merchants = dbAll(`
      SELECT m.*, (SELECT COUNT(*) FROM reply_history WHERE merchant_id = m.id) as reply_count
      FROM merchants m
      ORDER BY m.created_at DESC
    `)
    res.json(merchants)
  } catch (err) {
    console.error('[Admin Merchants] Error:', err.message)
    res.status(500).json({ error: '获取商家列表失败' })
  }
})

// PUT /api/admin/merchants/:id/plan — update merchant plan
router.put('/admin/merchants/:id/plan', adminAuth, (req, res) => {
  try {
    const { id } = req.params
    const { plan } = req.body

    if (!plan || !PLAN_LIMITS[plan]) {
      return res.status(400).json({ error: '无效的套餐类型，可选: free, pro, enterprise' })
    }

    const merchant = dbGet('SELECT id, email, store_name FROM merchants WHERE id = ?', [id])
    if (!merchant) {
      return res.status(404).json({ error: '商家不存在' })
    }

    const monthlyLimit = PLAN_LIMITS[plan]
    dbRun('UPDATE merchants SET plan = ?, monthly_limit = ? WHERE id = ?', [plan, monthlyLimit, id])

    res.json({ message: '套餐更新成功', merchant: { id: merchant.id, email: merchant.email, storeName: merchant.store_name, plan, monthlyLimit } })
  } catch (err) {
    console.error('[Admin Update Plan] Error:', err.message)
    res.status(500).json({ error: '更新套餐失败' })
  }
})

// GET /api/admin/stats — system statistics
router.get('/admin/stats', adminAuth, (req, res) => {
  try {
    const totalMerchants = dbGet('SELECT COUNT(*) as count FROM merchants').count

    const totalRepliesThisMonth = dbGet(`
      SELECT COUNT(*) as count FROM reply_history
      WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `).count

    const planRows = dbAll('SELECT plan, COUNT(*) as count FROM merchants GROUP BY plan')
    const plansDistribution = {}
    planRows.forEach(r => { plansDistribution[r.plan] = r.count })

    const typeRows = dbAll('SELECT store_type, COUNT(*) as count FROM merchants GROUP BY store_type')
    const merchantsByType = {}
    typeRows.forEach(r => {
      const type = r.store_type || '未知'
      merchantsByType[type] = (merchantsByType[type] || 0) + r.count
    })

    res.json({
      totalMerchants,
      totalRepliesThisMonth,
      plansDistribution,
      merchantsByType,
    })
  } catch (err) {
    console.error('[Admin Stats] Error:', err.message)
    res.status(500).json({ error: '获取统计失败' })
  }
})

module.exports = router
