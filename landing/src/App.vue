<template>
  <div class="app">
    <Navbar />
    <main>
      <Hero />
      <Demo />
      <Features />
      <Pricing />
      <Signup />
    </main>
    <footer class="footer">
      <div class="container">
        <p>© 2026 差评自动回复生成器 · 帮助中小商家轻松应对差评</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import Navbar from './components/Navbar.vue'
import Hero from './components/Hero.vue'
import Demo from './components/Demo.vue'
import Features from './components/Features.vue'
import Pricing from './components/Pricing.vue'
import Signup from './components/Signup.vue'
</script>
