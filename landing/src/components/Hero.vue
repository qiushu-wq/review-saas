<template>
  <section class="hero">
    <div class="container hero-inner">
      <div class="hero-content">
        <div class="hero-badge">🤖 AI 智能生成 · 三步流程</div>
        <h1 class="hero-title">差评回复，<span class="highlight">3 秒</span>生成</h1>
        <p class="hero-subtitle">AI 自动生成专业、有温度的差评回复，提升店铺评分和客户满意度</p>
        <div class="hero-actions">
          <a href="#demo" class="btn btn-primary btn-lg" @click.prevent="scrollTo('demo')">在线体验</a>
          <a href="#pricing" class="btn btn-outline btn-lg">查看定价</a>
        </div>
        <p class="hero-trust">✅ 已帮助 100+ 商家提升回复效率</p>
      </div>
      <div class="hero-visual">
        <div class="hero-card">
          <div class="hero-card-header">📝 差评原文</div>
          <div class="hero-card-body">"等了快一个小时才上菜，味道也很一般，不会再来了。"</div>
          <div class="hero-card-divider"></div>
          <div class="hero-card-header">🤖 AI 回复</div>
          <div class="hero-card-body hero-card-reply">
            "您好，看到您的反馈我们非常抱歉。等了一个小时才吃上，换谁都会很生气..."
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}
</script>

<style scoped>
.hero {
  padding: 140px 0 80px;
  background: linear-gradient(135deg, #FFFAF5 0%, #FFF3E0 50%, #FFFAF5 100%);
}

.hero-inner {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
}

.hero-content { max-width: 520px; }

.hero-badge {
  display: inline-block;
  padding: 6px 14px;
  background: var(--primary-light);
  color: var(--primary-dark);
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 20px;
}

.hero-title {
  font-size: 48px;
  font-weight: 800;
  line-height: 1.15;
  margin-bottom: 16px;
  color: var(--text);
}

.highlight {
  color: var(--primary-dark);
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 18px;
  color: var(--text-secondary);
  line-height: 1.7;
  margin-bottom: 32px;
}

.hero-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.hero-trust {
  font-size: 14px;
  color: var(--text-light);
}

.hero-visual {
  display: flex;
  justify-content: center;
}

.hero-card {
  background: var(--card);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.08);
  padding: 24px;
  width: 100%;
  max-width: 400px;
  border: 1px solid var(--border);
}

.hero-card-header {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.hero-card-body {
  font-size: 14px;
  color: var(--text);
  line-height: 1.7;
  padding: 12px;
  background: #f8f6f4;
  border-radius: 8px;
}

.hero-card-reply { color: var(--primary-dark); }

.hero-card-divider {
  height: 1px;
  background: var(--border);
  margin: 16px 0;
}

@media (max-width: 768px) {
  .hero { padding: 100px 0 48px; }
  .hero-inner { grid-template-columns: 1fr; gap: 40px; }
  .hero-title { font-size: 34px; }
  .hero-actions { flex-direction: column; }
}
</style>
