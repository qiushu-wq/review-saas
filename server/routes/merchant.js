const { Router } = require('express')
const bcrypt = require('bcryptjs')
const { dbGet, dbRun } = require('../db/init')
const { authMiddleware, generateToken } = require('../middleware/auth')

const router = Router()

// POST /api/register
router.post('/register', (req, res) => {
  try {
    const { email, password, storeName, storeType } = req.body
    if (!email || !password) return res.status(400).json({ error: '邮箱和密码不能为空' })
    if (password.length < 6) return res.status(400).json({ error: '密码至少 6 位' })

    const existing = dbGet('SELECT id FROM merchants WHERE email = ?', [email])
    if (existing) return res.status(409).json({ error: '该邮箱已注册' })

    const hash = bcrypt.hashSync(password, 10)
    const result = dbRun(
      'INSERT INTO merchants (email, password_hash, store_name, store_type) VALUES (?, ?, ?, ?)',
      [email, hash, storeName || '', storeType || '']
    )

    const merchant = { id: result.lastInsertRowid, email }
    const token = generateToken(merchant)

    res.status(201).json({
      token,
      merchant: { id: merchant.id, email, storeName: storeName || '', storeType: storeType || '', plan: 'free' },
    })
  } catch (err) {
    console.error('[Register] Error:', err.message)
    res.status(500).json({ error: '注册失败，请稍后再试' })
  }
})

// POST /api/login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: '邮箱和密码不能为空' })

    const merchant = dbGet('SELECT * FROM merchants WHERE email = ?', [email])
    if (!merchant) return res.status(401).json({ error: '邮箱或密码错误' })

    const valid = bcrypt.compareSync(password, merchant.password_hash)
    if (!valid) return res.status(401).json({ error: '邮箱或密码错误' })

    const token = generateToken(merchant)
    res.json({
      token,
      merchant: {
        id: merchant.id,
        email: merchant.email,
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
      'SELECT id, email, store_name, store_type, plan, monthly_limit, used_this_month, created_at FROM merchants WHERE id = ?',
      [req.merchantId]
    )
    if (!merchant) return res.status(404).json({ error: '商家不存在' })
    res.json({
      id: merchant.id,
      email: merchant.email,
      storeName: merchant.store_name,
      storeType: merchant.store_type,
      plan: merchant.plan,
      monthlyLimit: merchant.monthly_limit,
      usedThisMonth: merchant.used_this_month,
      createdAt: merchant.created_at,
    })
  } catch (err) {
    console.error('[Me] Error:', err.message)
    res.status(500).json({ error: '获取信息失败' })
  }
})

// PUT /api/me
router.put('/me', authMiddleware, (req, res) => {
  try {
    const { storeName, storeType } = req.body
    dbRun('UPDATE merchants SET store_name = ?, store_type = ? WHERE id = ?', [
      storeName || '', storeType || '', req.merchantId
    ])
    res.json({ message: '更新成功' })
  } catch (err) {
    console.error('[Update] Error:', err.message)
    res.status(500).json({ error: '更新失败' })
  }
})

module.exports = router
