<template>
  <section id="signup" class="section signup">
    <div class="container">
      <div class="signup-card card">
        <h2 class="section-title">开始免费使用</h2>
        <p class="section-subtitle">注册即享 7 天专业版免费试用，无需信用卡</p>

        <form class="signup-form" @submit.prevent="handleSignup">
          <div class="form-row">
            <input v-model="email" type="email" placeholder="邮箱地址" required class="form-input">
            <input v-model="password" type="password" placeholder="密码（至少 6 位）" required class="form-input" minlength="6">
          </div>
          <div class="form-row">
            <input v-model="storeName" placeholder="店铺名称（选填）" class="form-input">
            <select v-model="storeType" class="form-input">
              <option value="">店铺类型（选填）</option>
              <option value="餐饮">餐饮</option>
              <option value="电商">电商</option>
              <option value="本地服务">本地服务</option>
              <option value="其他">其他</option>
            </select>
          </div>
          <button type="submit" class="btn btn-primary btn-lg" style="width:100%;justify-content:center;" :disabled="loading">
            {{ loading ? '注册中...' : '免费注册 →' }}
          </button>
          <p v-if="error" class="form-error">{{ error }}</p>
          <p v-if="success" class="form-success">{{ success }}</p>
          <p class="form-note">注册即代表同意《服务协议》和《隐私政策》</p>
        </form>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'

const email = ref('')
const password = ref('')
const storeName = ref('')
const storeType = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')

async function handleSignup() {
  error.value = ''
  success.value = ''
  if (!email.value || !password.value) { error.value = '请填写邮箱和密码'; return }
  if (password.value.length < 6) { error.value = '密码至少 6 位'; return }

  loading.value = true
  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value, storeName: storeName.value, storeType: storeType.value }),
    })
    const data = await res.json()
    if (!res.ok) { error.value = data.error || '注册失败'; return }
    localStorage.setItem('token', data.token)
    success.value = `🎉 注册成功！欢迎 ${data.merchant.email}`
    email.value = ''; password.value = ''; storeName.value = ''; storeType.value = ''
    window.location.href = '/dashboard/dashboard.html?onboarding=1'
  } catch {
    error.value = '网络错误，请稍后再试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.signup { background: linear-gradient(135deg, #FFFAF5, #FFF3E0); }
.signup-card { max-width: 520px; margin: 0 auto; padding: 48px; }
.signup-form { max-width: 420px; margin: 0 auto; }
.form-row { display: flex; gap: 12px; margin-bottom: 12px; }
.form-input {
  flex: 1; padding: 12px 16px;
  border: 1.5px solid var(--border); border-radius: 8px;
  font-size: 15px; font-family: inherit; outline: none;
  transition: border-color .2s;
}
.form-input:focus { border-color: var(--primary); }
select.form-input { appearance: auto; }
.form-error { color: #e74c3c; font-size: 14px; text-align: center; margin-top: 8px; }
.form-success { color: var(--success); font-size: 14px; text-align: center; margin-top: 8px; }
.form-note { text-align: center; font-size: 12px; color: var(--text-light); margin-top: 12px; }
@media (max-width: 768px) { .form-row { flex-direction: column; } }
</style>
