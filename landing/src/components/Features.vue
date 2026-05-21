<template>
  <section class="section features">
    <div class="container">
      <h2 class="section-title">为什么选择我们？</h2>
      <p class="section-subtitle">从差评到好评，只需要三步</p>

      <div class="features-grid">
        <div class="card feature-card" v-for="f in features" :key="f.title">
          <div class="feature-icon">{{ f.icon }}</div>
          <h3 class="feature-title">{{ f.title }}</h3>
          <p class="feature-desc">{{ f.desc }}</p>
        </div>
      </div>

      <div class="steps-showcase">
        <div class="step-item" v-for="(s, i) in steps" :key="i">
          <div class="step-circle">{{ i + 1 }}</div>
          <div class="step-info">
            <h4>{{ s.title }}</h4>
            <p>{{ s.desc }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
const features = [
  { icon: '🤖', title: 'AI 智能生成', desc: '自动分析差评内容，生成贴合场景的回复，每一条都经过三重质检' },
  { icon: '📋', title: '三步流程', desc: '情绪安抚 → 原因核实 → 补偿方案，每一步都有实质内容，不敷衍不空洞' },
  { icon: '🚀', title: '一键回复', desc: '生成后一键复制，粘贴到各平台即可回复，无需切换工具' },
  { icon: '📊', title: '效果追踪', desc: '回复历史自动保存，追踪每条差评的处理进度' },
]

const steps = [
  { title: '情绪安抚', desc: '先共情，再道歉。让顾客感受到被重视和被理解' },
  { title: '原因核实', desc: '温和确认具体问题，复述顾客反馈，展示你听懂了' },
  { title: '补偿方案', desc: '根据问题严重程度提供阶梯式补偿，用具体行动收尾' },
]
</script>

<style scoped>
.features { background: #fff; }

.features-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-bottom: 64px;
}

.feature-card { text-align: center; padding: 32px 20px; }

.feature-icon { font-size: 40px; margin-bottom: 16px; }
.feature-title { font-size: 18px; font-weight: 700; margin-bottom: 8px; }
.feature-desc { font-size: 14px; color: var(--text-secondary); line-height: 1.7; }

.steps-showcase {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
  padding: 40px;
  background: var(--bg);
  border-radius: var(--radius);
}

.step-item { display: flex; gap: 16px; align-items: flex-start; }

.step-circle {
  width: 40px; height: 40px; border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: #fff; font-weight: 700; font-size: 18px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

.step-info h4 { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
.step-info p { font-size: 13px; color: var(--text-secondary); line-height: 1.6; }

@media (max-width: 768px) {
  .features-grid { grid-template-columns: repeat(2, 1fr); }
  .steps-showcase { grid-template-columns: 1fr; padding: 24px; }
}
</style>
