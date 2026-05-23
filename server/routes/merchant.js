const { Router } = require('express')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const { dbGet, dbRun } = require('../db/init')
const { authMiddleware, generateToken } = require('../middleware/auth')

const router = Router()

function generateReferralCode() {
  return 'rs_' + crypto.randomBytes(4).toString('hex')
}

// POST /api/register
router.post('/register', (req, res) => {
  try {
    const { email, phone, password, storeName, storeType, referralCode } = req.body
    if (!email && !phone) return res.status(400).json({ error: '邮箱或手机号不能为空' })
    if (!password) return res.status(400).json({ error: '密码不能为空' })
    if (password.length < 6) return res.status(400).json({ error: '密码至少 6 位' })

    // Check both email and phone uniqueness
    if (email) {
      const existing = dbGet('SELECT id FROM merchants WHERE email = ?', [email])
      if (existing) return res.status(409).json({ error: '该邮箱已注册' })
    }
    if (phone) {
      const existing = dbGet('SELECT id FROM merchants WHERE phone = ?', [phone])
      if (existing) return res.status(409).json({ error: '该手机号已注册' })
    }

    // Validate referral code if provided
    let referrerId = null
    if (referralCode) {
      const referrer = dbGet('SELECT id FROM merchants WHERE referral_code = ?', [referralCode])
      if (!referrer) return res.status(400).json({ error: '邀请码无效' })
      if (referrer.id === 'self') return res.status(400).json({ error: '不能邀请自己' })
      referrerId = referrer.id
    }

    const hash = bcrypt.hashSync(password, 10)
    const code = generateReferralCode()

    const result = dbRun(
      'INSERT INTO merchants (email, phone, password_hash, store_name, store_type, referral_code, referred_by, bonus_monthly) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [email || null, phone || null, hash, storeName || '', storeType || '', code, referrerId, referrerId ? 10 : 0]
    )

    // If referred, give referrer +10 bonus and log
    if (referrerId) {
      dbRun('UPDATE merchants SET bonus_monthly = bonus_monthly + 10 WHERE id = ?', [referrerId])
      dbRun(
        'INSERT INTO referral_log (referrer_id, referred_id, bonus_amount) VALUES (?, ?, 10)',
        [referrerId, result.lastInsertRowid]
      )
      const referrerData = dbGet('SELECT monthly_limit FROM merchants WHERE id = ?', [referrerId])
      if (referrerData) {
        dbRun('UPDATE merchants SET monthly_limit = monthly_limit + 10 WHERE id = ?', [referrerId])
      }
    }

    const merchant = dbGet('SELECT id, email, phone, store_name, store_type, referral_code FROM merchants WHERE id = ?', [result.lastInsertRowid])
    const token = generateToken(merchant)

    res.status(201).json({
      token,
      merchant: {
        id: merchant.id,
        email: merchant.email || '',
        phone: merchant.phone || '',
        storeName: merchant.store_name || '',
        storeType: merchant.store_type || '',
        plan: 'free',
        referralCode: merchant.referral_code,
      },
    })
  } catch (err) {
    console.error('[Register] Error:', err.message)
    res.status(500).json({ error: '注册失败，请稍后再试' })
  }
})

// POST /api/login
router.post('/login', (req, res) => {
  try {
    const { account, email, password } = req.body
    const loginId = account || email
    if (!loginId || !password) return res.status(400).json({ error: '账号和密码不能为空' })

    // Support login by email or phone
    const isEmail = loginId.includes('@')
    const merchant = isEmail
      ? dbGet('SELECT * FROM merchants WHERE email = ?', [loginId])
      : dbGet('SELECT * FROM merchants WHERE phone = ?', [loginId])
    if (!merchant) return res.status(401).json({ error: '账号或密码错误' })

    const valid = bcrypt.compareSync(password, merchant.password_hash)
    if (!valid) return res.status(401).json({ error: '账号或密码错误' })

    const token = generateToken(merchant)
    res.json({
      token,
      merchant: {
        id: merchant.id,
        email: merchant.email || '',
        phone: merchant.phone || '',
        storeName: merchant.store_name,
        storeType: merchant.store_type,
        plan: merchant.plan,
      },
    })
  } catch (err) {
    console.error('[Login] Error:', err.message)
    res.status(500).json({ error: '登录失败，请稍后再试' })
  }
})

// GET /api/me
router.get('/me', authMiddleware, (req, res) => {
  try {
    const merchant = dbGet(
      'SELECT id, email, phone, store_name, store_type, plan, monthly_limit, used_this_month, created_at, referral_code, bonus_monthly FROM merchants WHERE id = ?',
      [req.merchantId]
    )
    if (!merchant) return res.status(404).json({ error: '商家不存在' })
    res.json({
      id: merchant.id,
      email: merchant.email || '',
      phone: merchant.phone || '',
      storeName: merchant.store_name,
      storeType: merchant.store_type,
      plan: merchant.plan,
      monthlyLimit: merchant.monthly_limit,
      usedThisMonth: merchant.used_this_month,
      createdAt: merchant.created_at,
      referralCode: merchant.referral_code,
      bonusMonthly: merchant.bonus_monthly,
    })
  } catch (err) {
    console.error('[Me] Error:', err.message)
    res.status(500).json({ error: '获取信息失败' })
  }
})

// PUT /api/me
router.put('/me', authMiddleware, (req, res) => {
  try {
    const { storeName, storeType, lastCheckedAt } = req.body
    const updates = []
    const params = []
    if (storeName !== undefined) { updates.push('store_name = ?'); params.push(storeName) }
    if (storeType !== undefined) { updates.push('store_type = ?'); params.push(storeType) }
    if (lastCheckedAt !== undefined) { updates.push('last_checked_at = ?'); params.push(lastCheckedAt) }
    if (updates.length === 0) return res.status(400).json({ error: '没有要更新的字段' })
    params.push(req.merchantId)
    dbRun(`UPDATE merchants SET ${updates.join(', ')} WHERE id = ?`, params)
    res.json({ message: '更新成功' })
  } catch (err) {
    console.error('[Update] Error:', err.message)
    res.status(500).json({ error: '更新失败' })
  }
})

module.exports = router
