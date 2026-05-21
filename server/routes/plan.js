const { Router } = require('express')
const { dbGet, dbRun } = require('../db/init')
const { authMiddleware } = require('../middleware/auth')

const router = Router()

// POST /api/plan/upgrade
router.post('/plan/upgrade', authMiddleware, (req, res) => {
  try {
    const { toPlan } = req.body
    if (!toPlan || !['pro', 'enterprise'].includes(toPlan)) {
      return res.status(400).json({ error: '请选择要升级的套餐' })
    }
    const merchant = dbGet('SELECT plan FROM merchants WHERE id = ?', [req.merchantId])
    if (!merchant) return res.status(404).json({ error: '商家不存在' })
    if (merchant.plan === toPlan) return res.status(400).json({ error: '已是该套餐' })

    dbRun('INSERT INTO plan_requests (merchant_id, from_plan, to_plan, status) VALUES (?, ?, ?, ?)',
      [req.merchantId, merchant.plan, toPlan, 'pending'])
    res.json({ message: '升级请求已提交，我们将尽快处理' })
  } catch (err) {
    console.error('[Plan Upgrade] Error:', err.message)
    res.status(500).json({ error: '提交失败，请稍后再试' })
  }
})

// GET /api/plan/info
router.get('/plan/info', authMiddleware, (req, res) => {
  try {
    const merchant = dbGet('SELECT plan, monthly_limit, used_this_month FROM merchants WHERE id = ?', [req.merchantId])
    if (!merchant) return res.status(404).json({ error: '商家不存在' })

    const plans = [
      { id: 'free', name: '免费版', price: 0, monthlyLimit: 50, features: ['每月 50 条回复', '基础模板生成', '回复历史保存'] },
      { id: 'pro', name: '专业版', price: 49, monthlyLimit: 500, features: ['每月 500 条回复', 'AI 智能生成', '多店铺管理', '用量统计'] },
      { id: 'enterprise', name: '企业版', price: 199, monthlyLimit: 99999, features: ['无限条数', '专属 AI 模型微调', 'API 接入', '专属客服'] },
    ]

    res.json({
      currentPlan: merchant.plan,
      usedThisMonth: merchant.used_this_month,
      monthlyLimit: merchant.monthly_limit,
      availablePlans: plans.filter(p => {
        if (merchant.plan === 'free') return p.id !== 'free'
        if (merchant.plan === 'pro') return p.id === 'enterprise'
        return false
      }),
    })
  } catch (err) {
    console.error('[Plan Info] Error:', err.message)
    res.status(500).json({ error: '获取套餐信息失败' })
  }
})

module.exports = router
