const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'review-saas-jwt-secret'

function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: '请先登录' })
  }
  try {
    const token = header.slice(7)
    const decoded = jwt.verify(token, JWT_SECRET)
    req.merchantId = decoded.id
    next()
  } catch (err) {
    return res.status(401).json({ error: '登录已过期，请重新登录' })
  }
}

function generateToken(merchant) {
  return jwt.sign({ id: merchant.id, email: merchant.email }, JWT_SECRET, { expiresIn: '7d' })
}

module.exports = { authMiddleware, generateToken }
