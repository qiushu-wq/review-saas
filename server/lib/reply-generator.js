const { TEMPLATES, COMPENSATION } = require('./reply-templates')

const SEVERITY_RULES = [
  {
    level: 'severe',
    label: '重度问题 — 触发紧急处理流程',
    keywords: ['12315', '投诉', '举报', '媒体曝光', '食品安全', '头发', '虫子', '变质', '发霉', '异物', '中毒', '拉肚子', '媒体', '曝光', '维权'],
  },
  {
    level: 'moderate',
    label: '中度问题 — 需重点跟进',
    keywords: ['态度差', '态度太差', '态度不好', '态度恶劣', '服务差', '服务太差', '服务不好', '质量不行', '质量差', '破损', '漏发', '错发', '客服不理', '客服不处理', '不理人', '没人管', '不退款', '推卸', '忽悠', '欺骗', '虚假'],
  },
]

function detectSeverity(text) {
  for (const rule of SEVERITY_RULES) {
    if (rule.keywords.some(k => text.includes(k))) return rule
  }
  return { level: 'light', label: '轻度问题 — 常规处理' }
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function fillCompAmount(desc, severity) {
  if (!desc.includes('{compAmount}')) return desc
  // 只有 {compAmount}折 才表示折扣（如"8折"），避免"享终身折扣"误触发
  const isDiscount = desc.includes('{compAmount}折')
  return desc.replace(/\{compAmount\}/g, () => {
    if (isDiscount) return pick(['8', '8.5', '9', '9.5']).toString()
    if (severity === 'severe') return pick(['200', '300', '500', '800', '1000']).toString()
    if (severity === 'moderate') return pick(['20', '30', '50', '80']).toString()
    return pick(['5', '8', '10', '15', '20']).toString()
  })
}

function detectIndustry(text) {
  const ecommerceKeywords = ['快递', '物流', '发货', '包裹', '退货', '退款', '换货', '收到商品', '尺码', '破损', '漏发', '错发', '订单', '配送', '送货']
  const serviceKeywords = ['预约', '服务', '体验', '项目', '技师', '到店', '门店', '排队', '环境', '效果']

  if (ecommerceKeywords.some(k => text.includes(k))) return 'ecommerce'
  if (serviceKeywords.some(k => text.includes(k))) return 'local_service'
  return 'catering'
}

function extractIssues(text) {
  const issues = []
  if (/慢|久|等|超时/.test(text)) issues.push('等待时间')
  if (/态度|服务|不理/.test(text)) issues.push('服务态度')
  if (/味道|好吃|口味|难吃/.test(text)) issues.push('出品质量')
  if (/洒|漏|破损/.test(text)) issues.push('包装配送')
  if (/客服|没人|不处理/.test(text)) issues.push('客服响应')
  if (/头发|虫子|异物|变质/.test(text)) issues.push('食品安全')
  if (/贵|不值|性价比/.test(text)) issues.push('价格')
  if (/错|少|漏发|不对/.test(text)) issues.push('订单准确性')
  if (issues.length === 0) issues.push('整体体验')
  return issues.map(i => '「' + i + '」').join('、')
}

function fillTemplate(tpl, vars) {
  return tpl
    .replace(/\{product\}/g, vars.product || '')
    .replace(/\{storeName\}/g, vars.storeName || '')
    .replace(/\{issueList\}/g, vars.issueList || '')
    .replace(/\{compAmount\}/g, vars.compAmount || '')
}

/**
 * 生成差评回复
 *
 * @param {string} text - 差评原文
 * @param {string} store - 店铺名称
 * @param {string} product - 商品/服务名称
 * @param {object} [options] - 可选配置
 * @param {'catering'|'ecommerce'|'local_service'} [options.industry='catering'] - 行业
 * @param {'warm'|'professional'|'concise'} [options.tone='warm'] - 语气风格
 * @returns {{ steps: { comfort: string, verify: string, compensate: string }, severity: string, severityLabel: string, fullText: string }}
 */
function generateReply(text, store, product, options = {}) {
  const industry = options.industry || detectIndustry(text)
  const tone = options.tone || 'warm'
  const severity = detectSeverity(text)
  const issueList = extractIssues(text)

  const templates = TEMPLATES[industry]?.[tone]?.[severity.level]
  if (!templates) {
    throw new Error('No templates for ' + industry + '/' + tone + '/' + severity.level)
  }

  const vars = { product: product || '', storeName: store || '', issueList }

  const comfortText = fillTemplate(pick(templates.comfort), vars)
  const verifyText = fillTemplate(pick(templates.verify), vars)

  const compPool = COMPENSATION[industry]?.[severity.level]
  const compensateInfo = compPool ? pick(compPool) : { desc: '为您申请了适当补偿' }
  const compensateText = fillCompAmount(compensateInfo.desc, severity.level)
    .replace(/\{product\}/g, vars.product)
    .replace(/\{storeName\}/g, vars.storeName)

  const fullText = '【情绪安抚】\n' + comfortText + '\n\n【原因核实】\n' + verifyText + '\n\n【补偿方案】\n' + compensateText + '\n\n—— ' + (store || '本店')

  return {
    steps: { comfort: comfortText, verify: verifyText, compensate: compensateText },
    severity: severity.level,
    severityLabel: severity.label,
    fullText,
  }
}

module.exports = { generateReply, detectSeverity }
