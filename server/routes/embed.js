const { Router } = require('express')
const { dbGet, dbRun } = require('../db/init')
const { authMiddleware } = require('../middleware/auth')

const router = Router()

// GET /api/embed/config
router.get('/embed/config', authMiddleware, (req, res) => {
  try {
    let config = dbGet('SELECT * FROM embed_config WHERE merchant_id = ?', [req.merchantId])
    if (!config) {
      config = { widget_title: '智评助手', theme_color: '#FFB74D', position: 'right', is_active: 1 }
    }
    res.json({
      widgetTitle: config.widget_title,
      themeColor: config.theme_color,
      position: config.position,
      isActive: config.is_active,
    })
  } catch (err) {
    console.error('[Embed Config] Error:', err.message)
    res.status(500).json({ error: '获取配置失败' })
  }
})

// PUT /api/embed/config
router.put('/embed/config', authMiddleware, (req, res) => {
  try {
    const { widgetTitle, themeColor, position, isActive } = req.body
    const existing = dbGet('SELECT id FROM embed_config WHERE merchant_id = ?', [req.merchantId])
    if (existing) {
      dbRun(
        'UPDATE embed_config SET widget_title = ?, theme_color = ?, position = ?, is_active = ? WHERE merchant_id = ?',
        [widgetTitle || '智评助手', themeColor || '#FFB74D', position || 'right', isActive !== undefined ? (isActive ? 1 : 0) : 1, req.merchantId]
      )
    } else {
      dbRun(
        'INSERT INTO embed_config (merchant_id, widget_title, theme_color, position, is_active) VALUES (?, ?, ?, ?, ?)',
        [req.merchantId, widgetTitle || '智评助手', themeColor || '#FFB74D', position || 'right', isActive !== undefined ? (isActive ? 1 : 0) : 1]
      )
    }
    res.json({ message: '保存成功' })
  } catch (err) {
    console.error('[Embed Config Update] Error:', err.message)
    res.status(500).json({ error: '保存失败' })
  }
})

// GET /api/embed/widget.js
router.get('/embed/widget.js', (req, res) => {
  try {
    const apiKey = req.query.key
    if (!apiKey) return res.status(400).json({ error: 'Missing API key' })

    const key = dbGet('SELECT * FROM api_keys WHERE key_value = ? AND is_active = 1', [apiKey])
    if (!key) return res.status(401).json({ error: 'Invalid API key' })

    let config = dbGet('SELECT * FROM embed_config WHERE merchant_id = ?', [key.merchant_id])
    if (!config) {
      config = { widget_title: '智评助手', theme_color: '#FFB74D', position: 'right' }
    }

    const title = config.widget_title || '智评助手'
    const themeColor = config.theme_color || '#FFB74D'
    const position = config.position || 'right'

    res.set('Content-Type', 'application/javascript')
    res.send(`
(function() {
  var CONFIG = {
    apiKey: "${apiKey}",
    baseUrl: window.location.origin,
    title: "${title}",
    themeColor: "${themeColor}",
    position: "${position}"
  };

  // Inject FAB button
  var fab = document.createElement('button');
  fab.innerHTML = '\u{1F4AC}';
  fab.style.cssText = 'position:fixed;bottom:20px;' + CONFIG.position + ':20px;width:56px;height:56px;border-radius:50%;background:' + CONFIG.themeColor + ';color:#fff;font-size:24px;border:none;box-shadow:0 4px 12px rgba(0,0,0,0.2);cursor:pointer;z-index:99999;';
  document.body.appendChild(fab);

  // Modal
  var modal = document.createElement('div');
  modal.style.cssText = 'display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.4);z-index:100000;justify-content:center;align-items:center;';
  modal.innerHTML =
    '<div style="background:#fff;border-radius:12px;padding:24px;max-width:480px;width:90%;max-height:80vh;overflow-y:auto;font-family:sans-serif;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
        '<h3 style="margin:0;font-size:18px;">' + CONFIG.title + '</h3>' +
        '<button id="rsw-close" style="background:none;border:none;font-size:20px;cursor:pointer;">✕</button>' +
      '</div>' +
      '<div id="rsw-content">' +
        '<textarea id="rsw-review" placeholder="粘贴差评原文..." style="width:100%;padding:10px;border:1.5px solid #e9ecef;border-radius:8px;font-size:14px;min-height:80px;box-sizing:border-box;font-family:inherit;margin-bottom:12px;"></textarea>' +
        '<input id="rsw-store" placeholder="店铺名称（选填）" style="width:100%;padding:10px;border:1.5px solid #e9ecef;border-radius:8px;font-size:14px;box-sizing:border-box;font-family:inherit;margin-bottom:12px;">' +
        '<input id="rsw-product" placeholder="商品/服务（选填）" style="width:100%;padding:10px;border:1.5px solid #e9ecef;border-radius:8px;font-size:14px;box-sizing:border-box;font-family:inherit;margin-bottom:12px;">' +
        '<button id="rsw-generate" style="width:100%;padding:10px;background:' + CONFIG.themeColor + ';color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">\u{1F916} 生成回复</button>' +
        '<div id="rsw-result" style="margin-top:12px;display:none;"></div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);

  // Show / hide modal
  fab.onclick = function() { modal.style.display = 'flex'; };
  document.getElementById('rsw-close').onclick = function() { modal.style.display = 'none'; };
  modal.onclick = function(e) { if (e.target === modal) modal.style.display = 'none'; };

  // Generate reply
  document.getElementById('rsw-generate').onclick = function() {
    var btn = document.getElementById('rsw-generate');
    btn.disabled = true;
    btn.textContent = '生成中...';
    var review = document.getElementById('rsw-review').value;
    if (!review) {
      alert('请输入差评内容');
      btn.disabled = false;
      btn.innerHTML = '\u{1F916} 生成回复';
      return;
    }
    fetch(CONFIG.baseUrl + '/api/external/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': CONFIG.apiKey },
      body: JSON.stringify({
        reviewContent: review,
        storeName: document.getElementById('rsw-store').value,
        productName: document.getElementById('rsw-product').value
      })
    }).then(function(r) { return r.json(); }).then(function(data) {
      if (data.error) { alert(data.error); return; }
      var result = document.getElementById('rsw-result');
      result.style.display = 'block';
      var replyText = data.reply || data.fullText || '';
      result.innerHTML =
        '<div style="padding:12px;background:#f8f6f4;border-radius:8px;font-size:14px;line-height:1.6;white-space:pre-wrap;">' + replyText + '</div>' +
        '<button id="rsw-copy" style="margin-top:8px;padding:6px 14px;border:1px solid #e9ecef;border-radius:4px;background:#fff;cursor:pointer;font-size:12px;">\u{1F4CB} 复制</button>';
      document.getElementById('rsw-copy').onclick = function() {
        navigator.clipboard.writeText(replyText).then(function() {
          alert('✅ 已复制');
        });
      };
    }).catch(function() {
      alert('生成失败，请稍后再试');
    }).finally(function() {
      btn.disabled = false;
      btn.innerHTML = '\u{1F916} 生成回复';
    });
  };
})();
`)
  } catch (err) {
    console.error('[Widget JS] Error:', err.message)
    res.status(500).json({ error: 'Widget generation failed' })
  }
})

module.exports = router
