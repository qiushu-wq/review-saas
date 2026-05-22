const jwt = require('jsonwebtoken')
const { dbGet, dbRun } = require('../db/init')

const JWT_SECRET = process.env.JWT_SECRET || 'review-saas-jwt-secret'

function authMiddleware(req, res, next) {
  // 1. Try JWT Bearer token (dashboard login)
  const header = req.headers.authorization
  if (header && header.startsWith('Bearer ')) {
    try {
      const token = header.slice(7)
      const decoded = jwt.verify(token, JWT_SECRET)
      req.merchantId = decoded.id
      return next()
    } catch (err) {
      // JWT invalid, fall through to API key check
    }
  }

  // 2. Try API key (x-api-key header — used by browser extension / external API)
  const apiKey = req.headers['x-api-key']
  if (apiKey) {
    const key = dbGet('SELECT merchant_id FROM api_keys WHERE key_value = ? AND is_active = 1', [apiKey])
    if (key) {
      // Update last_used_at
      try { dbRun('UPDATE api_keys SET last_used_at = datetime("now") WHERE key_value = ?', [apiKey]) } catch {}
      req.merchantId = key.merchant_id
      return next()
    }
  }

  return res.status(401).json({ error: '请先登录' })
}

function generateToken(merchant) {
  return jwt.sign({ id: merchant.id, email: merchant.email }, JWT_SECRET, { expiresIn: '7d' })
}

module.exports = { authMiddleware, generateToken }
