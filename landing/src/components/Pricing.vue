<template>
  <section id="pricing" class="section pricing">
    <div class="container">
      <h2 class="section-title">简单透明的定价</h2>
      <p class="section-subtitle">从小店到连锁品牌，找到适合你的方案</p>

      <div class="pricing-grid">
        <div v-for="plan in plans" :key="plan.name" class="card pricing-card" :class="{ highlighted: plan.highlighted }">
          <div class="pricing-badge" v-if="plan.badge">{{ plan.badge }}</div>
          <h3 class="pricing-name">{{ plan.name }}</h3>
          <p class="pricing-desc">{{ plan.desc }}</p>
          <div class="pricing-price">
            <span class="price">¥{{ plan.price }}</span>
            <span class="period">/{{ plan.period }}</span>
          </div>
          <ul class="pricing-features">
            <li v-for="f in plan.features" :key="f">✓ {{ f }}</li>
          </ul>
          <button class="btn" :class="plan.highlighted ? 'btn-primary' : 'btn-outline'" style="width:100%;justify-content:center;" @click="handleCta(plan)">
            {{ plan.cta }}
          </button>
        </div>
      </div>

      <p class="pricing-note">所有版本均支持 7 天免费试用，随时取消</p>
    </div>
  </section>
</template>

<script setup>
function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

function handleCta(plan) {
  if (plan.cta === '免费开通' || plan.cta === '立即订阅') {
    scrollTo('signup')
  } else if (plan.cta === '联系商务') {
    alert('请联系商务团队：sales@example.com')
  }
}

const plans = [
  {
    name: '免费版', price: 0, period: '月', desc: '适合刚起步的小店',
    features: ['每月 50 条回复', '基础模板生成', '回复历史保存'],
    cta: '免费开通', highlighted: false,
  },
  {
    name: '专业版', price: 49, period: '月', desc: '适合稳定经营的商家',
    features: ['每月 500 条回复', 'AI 智能生成', '多店铺管理', '用量统计'],
    cta: '立即订阅', highlighted: true, badge: '推荐',
  },
  {
    name: '企业版', price: 199, period: '月', desc: '适合连锁品牌',
    features: ['无限条数', '专属 AI 模型微调', 'API 接入', '专属客服'],
    cta: '联系商务', highlighted: false,
  },
]
</script>

<style scoped>
.pricing-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  max-width: 900px;
  margin: 0 auto;
}

.pricing-card {
  text-align: center;
  padding: 40px 24px;
  position: relative;
  display: flex;
  flex-direction: column;
}

.pricing-card.highlighted {
  border-color: var(--primary);
  box-shadow: 0 8px 32px rgba(255,183,77,0.2);
  transform: scale(1.05);
}

.pricing-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--primary-dark);
  color: #fff;
  padding: 4px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
}

.pricing-name { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
.pricing-desc { font-size: 13px; color: var(--text-secondary); margin-bottom: 16px; }

.pricing-price { margin-bottom: 24px; }
.price { font-size: 42px; font-weight: 800; color: var(--text); }
.period { font-size: 16px; color: var(--text-secondary); }

.pricing-features {
  list-style: none;
  text-align: left;
  flex: 1;
  margin-bottom: 24px;
}
.pricing-features li {
  padding: 8px 0;
  font-size: 14px;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border);
}
.pricing-features li:last-child { border-bottom: none; }

.pricing-note {
  text-align: center;
  margin-top: 24px;
  font-size: 14px;
  color: var(--text-light);
}

@media (max-width: 768px) {
  .pricing-grid { grid-template-columns: 1fr; max-width: 400px; }
  .pricing-card.highlighted { transform: none; }
}
</style>
