<template>
  <nav class="navbar">
    <div class="container nav-inner">
      <div class="logo">✍️ 差评回复</div>
      <div class="nav-links">
        <a href="#demo" @click.prevent="scrollTo('demo')">在线体验</a>
        <a href="#pricing" @click.prevent="scrollTo('pricing')">定价</a>
        <a href="#signup" @click.prevent="goSignup">登录</a>
        <a href="#signup" class="btn btn-primary btn-sm" @click.prevent="goSignup">免费使用</a>
      </div>
    </div>
  </nav>
</template>

<script setup>
function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

function goSignup() {
  scrollTo('signup')
  // Switch to login mode if "登录" was clicked
  setTimeout(() => {
    const el = document.getElementById('signup')
    if (el && el.__vue_app__) {
      // Emit custom event for Signup component to toggle to login mode
      window.dispatchEvent(new CustomEvent('signup-mode', { detail: { login: true } }))
    }
  }, 500)
}
</script>

<style scoped>
.navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(255,250,245,0.95);
  backdrop-filter: blur(10px);
  z-index: 100;
  border-bottom: 1px solid var(--border);
}

.nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}

.logo {
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 24px;
}

.nav-links a {
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: color .2s;
}

.nav-links a:hover { color: var(--primary-dark); }

.btn-sm { padding: 8px 20px; font-size: 14px; }
</style>
