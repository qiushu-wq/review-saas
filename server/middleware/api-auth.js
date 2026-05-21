// api-auth.js - API Key 认证中间件
// 从 X-API-Key 头读取密钥，查 api_keys 表验证
// 找到后设置 req.merchantId 并更新 last_used_at
// 未找到返回 401

const { dbGet, dbRun } = require('../db/init')

function apiAuthMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key']
  if (!apiKey) {
    return res.status(401).json({ error: '请提供 API 密钥（X-API-Key 头）' })
  }
  try {
    const key = dbGet('SELECT * FROM api_keys WHERE key_value = ? AND is_active = 1', [apiKey])
    if (!key) {
      return res.status(401).json({ error: 'API 密钥无效或已禁用' })
    }
    req.merchantId = key.merchant_id
    // 异步更新 last_used_at，不阻塞请求
    try { dbRun('UPDATE api_keys SET last_used_at = datetime("now") WHERE id = ?', [key.id]) } catch {}
    next()
  } catch (err) {
    console.error('[API Auth] Error:', err.message)
    return res.status(500).json({ error: '认证服务异常' })
  }
}

module.exports = { apiAuthMiddleware }
