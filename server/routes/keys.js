const { Router } = require('express')
const crypto = require('crypto')
const { dbGet, dbRun, dbAll } = require('../db/init')
const { authMiddleware } = require('../middleware/auth')

const router = Router()

// POST /api/keys — 创建新密钥
router.post('/keys', authMiddleware, (req, res) => {
  try {
    const { keyName } = req.body
    if (!keyName) return res.status(400).json({ error: '密钥名称不能为空' })

    const keyValue = 'rs_' + crypto.randomUUID()
    const result = dbRun(
      'INSERT INTO api_keys (merchant_id, key_name, key_value) VALUES (?, ?, ?)',
      [req.merchantId, keyName, keyValue]
    )

    const key = dbGet('SELECT id, key_name, key_value, created_at FROM api_keys WHERE id = ?', [result.lastInsertRowid])
    res.status(201).json({
      id: key.id,
      keyName: key.key_name,
      keyValue: key.key_value,
      createdAt: key.created_at,
    })
  } catch (err) {
    console.error('[Create Key] Error:', err.message)
    res.status(500).json({ error: '创建密钥失败，请稍后再试' })
  }
})

// GET /api/keys — 列出密钥（key_value 遮罩）
router.get('/keys', authMiddleware, (req, res) => {
  try {
    const keys = dbAll(
      'SELECT id, key_name, key_value, is_active, last_used_at, created_at FROM api_keys WHERE merchant_id = ? ORDER BY created_at DESC',
      [req.merchantId]
    )
    res.json(keys.map(k => ({
      id: k.id,
      keyName: k.key_name,
      keyValueMasked: k.key_value.length > 8 ? k.key_value.slice(0, 8) + '****' : k.key_value + '****',
      isActive: !!k.is_active,
      lastUsedAt: k.last_used_at || null,
      createdAt: k.created_at,
    })))
  } catch (err) {
    console.error('[List Keys] Error:', err.message)
    res.status(500).json({ error: '获取密钥列表失败' })
  }
})

// PUT /api/keys/:id/toggle — 切换启用/禁用
router.put('/keys/:id/toggle', authMiddleware, (req, res) => {
  try {
    const key = dbGet('SELECT * FROM api_keys WHERE id = ? AND merchant_id = ?', [req.params.id, req.merchantId])
    if (!key) return res.status(404).json({ error: '密钥不存在' })

    dbRun('UPDATE api_keys SET is_active = ? WHERE id = ?', [key.is_active ? 0 : 1, key.id])
    res.json({ message: key.is_active ? '密钥已禁用' : '密钥已启用' })
  } catch (err) {
    console.error('[Toggle Key] Error:', err.message)
    res.status(500).json({ error: '操作失败，请稍后再试' })
  }
})

// DELETE /api/keys/:id — 删除密钥
router.delete('/keys/:id', authMiddleware, (req, res) => {
  try {
    const key = dbGet('SELECT id FROM api_keys WHERE id = ? AND merchant_id = ?', [req.params.id, req.merchantId])
    if (!key) return res.status(404).json({ error: '密钥不存在' })

    dbRun('DELETE FROM api_keys WHERE id = ?', [key.id])
    res.json({ message: '密钥已删除' })
  } catch (err) {
    console.error('[Delete Key] Error:', err.message)
    res.status(500).json({ error: '删除失败，请稍后再试' })
  }
})

module.exports = router
