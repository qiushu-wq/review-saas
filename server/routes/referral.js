const { Router } = require('express')
const { dbGet, dbAll } = require('../db/init')
const { authMiddleware } = require('../middleware/auth')

const router = Router()

// GET /api/referral/info
router.get('/referral/info', authMiddleware, (req, res) => {
  try {
    const merchant = dbGet(
      'SELECT id, referral_code, bonus_monthly FROM merchants WHERE id = ?',
      [req.merchantId]
    )
    if (!merchant) return res.status(404).json({ error: '商家不存在' })

    const referrals = dbAll(
      'SELECT m.email, m.store_name, rl.bonus_amount, rl.created_at FROM referral_log rl JOIN merchants m ON m.id = rl.referred_id WHERE rl.referrer_id = ? ORDER BY rl.created_at DESC',
      [req.merchantId]
    )

    res.json({
      referralCode: merchant.referral_code,
      inviteLink: 'https://web-production-3fdc6.up.railway.app?ref=' + merchant.referral_code,
      totalReferred: referrals.length,
      bonusEarned: merchant.bonus_monthly,
      referrals: referrals.map(r => ({
        email: r.email,
        storeName: r.store_name,
        bonusAmount: r.bonus_amount,
        createdAt: r.created_at,
      })),
    })
  } catch (err) {
    console.error('[Referral Info] Error:', err.message)
    res.status(500).json({ error: '获取邀请信息失败' })
  }
})

module.exports = router
