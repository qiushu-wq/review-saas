<template>
  <section id="demo" class="section">
    <div class="container">
      <h2 class="section-title">在线体验</h2>
      <p class="section-subtitle">粘贴一条差评，看看 AI 如何生成专业回复</p>

      <div class="demo-grid">
        <div class="card demo-input">
          <!-- 差评输入 -->
          <div class="demo-label">📝 差评内容</div>
          <textarea v-model="reviewInput" placeholder="请输入差评原文，例如：等了快一个小时才上菜，味道也很一般，服务生态度还不好，不会再来第二次了。" rows="4"></textarea>

          <!-- 行业 & 语气选择 -->
          <div class="demo-row">
            <div class="demo-field">
              <label>行业</label>
              <div class="btn-group">
                <button
                  v-for="ind in INDUSTRIES"
                  :key="ind.id"
                  class="btn-option"
                  :class="{ active: industry === ind.id }"
                  @click="industry = ind.id"
                >{{ ind.name }}</button>
              </div>
            </div>
            <div class="demo-field">
              <label>回复语气</label>
              <div class="btn-group">
                <button
                  v-for="t in TONES"
                  :key="t.id"
                  class="btn-option"
                  :class="{ active: tone === t.id }"
                  @click="tone = t.id"
                >{{ t.name }}</button>
              </div>
            </div>
          </div>

          <!-- 店铺/商品 -->
          <div class="demo-row">
            <div class="demo-field">
              <label>店铺名称 <span class="optional">（选填）</span></label>
              <input v-model="storeInput" placeholder="如：老王川菜馆">
            </div>
            <div class="demo-field">
              <label>商品/服务 <span class="optional">（选填）</span></label>
              <input v-model="productInput" placeholder="如：麻辣烫">
            </div>
          </div>

          <!-- 快捷测试用例 -- 按行业分组 -->
          <div class="demo-tests">
            <span class="test-group-label">{{ currentIndustryName }}</span>
            <button
              v-for="tc in currentTestCases"
              :key="tc.label"
              class="test-btn"
              @click="fillTest(tc)"
            >{{ tc.label }}</button>
          </div>

          <button class="btn btn-primary btn-generate" @click="doGenerate" :disabled="!reviewInput.trim() || loading">
            {{ loading ? '⏳ 生成中...' : '🤖 生成回复' }}
          </button>
        </div>

        <div class="card demo-output" v-if="result">
          <!-- 严重度 + 行业/语气标签 -->
          <div class="result-meta">
            <span class="severity-badge" :class="'severity-' + result.severity">{{ severityLabel }}</span>
            <span class="tag tag-industry">{{ currentIndustryName }}</span>
            <span class="tag tag-tone">{{ currentToneName }}</span>
          </div>

          <div class="reply-step" v-for="(step, i) in steps" :key="i">
            <div class="step-header">
              <span class="step-num">{{ i + 1 }}</span>
              <span class="step-name">{{ step.name }}</span>
            </div>
            <div class="step-text">{{ step.text }}</div>
          </div>

          <div class="output-footer">
            <span>—— {{ storeInput || '本店' }}</span>
            <button class="btn-copy" @click="copyResult">📋 复制全文</button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { generateReply, INDUSTRIES, TONES } from '../utils/reply-generator.js'

const reviewInput = ref('')
const storeInput = ref('')
const productInput = ref('')
const industry = ref('catering')
const tone = ref('warm')
const result = ref(null)
const loading = ref(false)

// Demo 调用后端 API（完整模板引擎），无需登录
const API_BASE = window.location.port === '5173' ? 'http://localhost:3002' : ''

// 快捷测试用例按行业分组
const TEST_CASES = {
  catering: [
    { label: '上菜慢', text: '等了快一小时才上菜，服务员态度也很差，不会再来第二次了。' },
    { label: '外卖洒了', text: '外卖送来汤都洒了，包装太差了，联系客服也没人理。' },
    { label: '有头发', text: '菜里有根头发，太恶心了！我要投诉这家店食品安全有问题！' },
    { label: '味道差', text: '味道太一般了，跟以前完全不能比，价格还涨了，不值这个价。' },
  ],
  ecommerce: [
    { label: '衣服破损', text: '收到的衣服破了个洞，质量也太差了，这也能发货？' },
    { label: '发错货', text: '发错货了，我要退货！客服半天都不回消息，太差了。' },
    { label: '物流太慢', text: '物流太慢了等了一周才到，问客服就说帮我催，一点用没有。' },
    { label: '图片不符', text: '实物跟图片完全不一样，这算虚假宣传吧？我要退货退款！' },
  ],
  local_service: [
    { label: '态度差', text: '前台爱答不理的，问什么都不耐烦，服务态度极差。' },
    { label: '效果不行', text: '做完效果跟没做一样，这水平也好意思收费？要求退款。' },
    { label: '乱加价', text: '预约时说好 399，到店做完说这个项目要加钱，变相加价。' },
  ],
}

const currentTestCases = computed(() => TEST_CASES[industry.value] || TEST_CASES.catering)
const currentIndustryName = computed(() => INDUSTRIES.find(i => i.id === industry.value)?.name || '')
const currentToneName = computed(() => TONES.find(t => t.id === tone.value)?.name || '')

const severityLabel = computed(() => {
  if (!result.value) return ''
  const map = {
    light: '轻度问题 — 常规处理',
    moderate: '中度问题 — 需重点跟进',
    severe: '重度问题 — 紧急处理',
  }
  return map[result.value.severity] || ''
})

const steps = computed(() => {
  if (!result.value) return []
  return [
    { name: '情绪安抚 · 共情 → 道歉 → 接纳', text: result.value.steps.comfort },
    { name: '原因核实 · 确认问题 → 温和追问', text: result.value.steps.verify },
    { name: '补偿方案 · 阶梯补偿 → 具体动作', text: result.value.steps.compensate },
  ]
})

function fillTest(tc) {
  reviewInput.value = tc.text
  doGenerate()
}

async function doGenerate() {
  if (!reviewInput.value.trim()) return
  loading.value = true
  try {
    const res = await fetch(API_BASE + '/api/demo/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reviewContent: reviewInput.value.trim(),
        storeName: storeInput.value,
        productName: productInput.value,
        industry: industry.value,
        tone: tone.value,
      }),
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    result.value = data
  } catch (e) {
    // 降级到本地模板
    result.value = generateReply(
      reviewInput.value.trim(),
      storeInput.value,
      productInput.value,
      { industry: industry.value, tone: tone.value }
    )
  } finally {
    loading.value = false
  }
}

async function copyResult() {
  if (!result.value) return
  try {
    await navigator.clipboard.writeText(result.value.fullText)
    const btn = document.querySelector('.btn-copy')
    btn.textContent = '✅ 已复制'
    setTimeout(() => { btn.textContent = '📋 复制全文' }, 2000)
  } catch { /* fallback */ }
}
</script>

<style scoped>
.demo-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  align-items: start;
}

.demo-label {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}

textarea {
  width: 100%;
  padding: 12px;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  outline: none;
  transition: border-color .2s;
}
textarea:focus { border-color: var(--primary); }

.demo-row { display: flex; gap: 12px; margin-top: 12px; }
.demo-field { flex: 1; }
.demo-field label { font-size: 13px; font-weight: 600; color: var(--text-secondary); display: block; margin-bottom: 4px; }
.optional { font-weight: 400; color: var(--text-light); font-size: 12px; }
.demo-field input {
  width: 100%; padding: 8px 12px;
  border: 1.5px solid var(--border); border-radius: 6px;
  font-size: 14px; font-family: inherit; outline: none;
}
.demo-field input:focus { border-color: var(--primary); }

/* 按钮组选择器 */
.btn-group {
  display: flex;
  gap: 4px;
  background: var(--bg);
  border-radius: 8px;
  padding: 3px;
  border: 1px solid var(--border);
}
.btn-option {
  flex: 1;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-family: inherit;
  transition: all .2s;
  white-space: nowrap;
}
.btn-option:hover { color: var(--text); }
.btn-option.active {
  background: var(--primary);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(255, 183, 77, 0.3);
}

/* 快捷测试用例 */
.demo-tests { display: flex; gap: 6px; margin-top: 12px; flex-wrap: wrap; align-items: center; }
.test-group-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-light);
  margin-right: 2px;
}
.test-btn {
  padding: 4px 12px; font-size: 12px; border-radius: 6px;
  border: 1px solid var(--border); background: var(--bg);
  color: var(--text-secondary); cursor: pointer; font-family: inherit;
  transition: all .2s;
}
.test-btn:hover { border-color: var(--primary); color: var(--primary); }

.btn-generate { width: 100%; margin-top: 16px; justify-content: center; }
.btn-generate:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

/* 结果头部元信息 */
.result-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.severity-badge {
  display: inline-block; padding: 4px 12px; border-radius: 6px;
  font-size: 13px; font-weight: 600;
}
.severity-light { background: #fef9e7; color: #b7950b; }
.severity-moderate { background: #fdebd0; color: #d35400; }
.severity-severe { background: #fdedec; color: #c0392b; }

.tag {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}
.tag-industry { background: #e8f5e9; color: #2e7d32; }
.tag-tone { background: #e3f2fd; color: #1565c0; }

.reply-step {
  border-left: 4px solid #ddd;
  padding: 12px 16px;
  margin-bottom: 12px;
  border-radius: 0 8px 8px 0;
  background: #fafafa;
}
.reply-step:nth-child(2) .step-num { background: var(--primary); }
.reply-step:nth-child(3) .step-num { background: var(--primary-dark); }

.step-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.step-num {
  width: 22px; height: 22px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: #f39c12; color: #fff; font-size: 12px; font-weight: 700;
  flex-shrink: 0;
}
.step-name { font-weight: 600; font-size: 13px; }
.step-text { font-size: 14px; line-height: 1.7; color: var(--text); }

.output-footer {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border);
  font-size: 13px; color: var(--text-secondary);
}

.btn-copy {
  padding: 6px 14px; font-size: 13px; border: 1px solid var(--border);
  border-radius: 6px; background: #fff; color: var(--text-secondary);
  cursor: pointer; font-family: inherit; transition: all .2s;
}
.btn-copy:hover { border-color: var(--primary); color: var(--primary); }
.btn-copy:active { background: var(--primary-light); }

@media (max-width: 768px) {
  .demo-grid { grid-template-columns: 1fr; }
  .demo-row { flex-direction: column; }
}
</style>
