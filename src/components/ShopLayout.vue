<script setup>
import { onBeforeUnmount, onMounted, provide, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authApi } from '../api'
import { useUserStore } from '../stores/user'
import { useCartStore } from '../stores/cart'
import AiDock from './AiDock.vue'
import CursorFx from './CursorFx.vue'

const route = useRoute()
const router = useRouter()
const store = useUserStore()
const cart = useCartStore()
const chatOpen = ref(false)
const scrolled = ref(false)
const progress = ref(0)
const showTop = ref(false)

provide('openChat', () => {
  chatOpen.value = true
})

function onScroll() {
  scrolled.value = window.scrollY > 24
  showTop.value = window.scrollY > 900
  const doc = document.documentElement
  const max = doc.scrollHeight - window.innerHeight
  progress.value = max > 0 ? Math.min(1, window.scrollY / max) : 0
}

function toTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

async function logout() {
  try {
    await authApi.logout()
  } catch {
    // 登出接口异常也照常清理本地会话
  }
  store.clear()
  router.push('/shop')
}
</script>

<template>
  <div class="shell">
    <!-- 背景：极光 + 细网格，固定不随内容滚动 -->
    <div class="backdrop" aria-hidden="true">
      <span class="aurora a1"></span>
      <span class="aurora a2"></span>
      <span class="aurora a3"></span>
      <div class="mesh"></div>
      <div class="vignette"></div>
    </div>

    <!-- 顶部滚动进度线 -->
    <div class="progress" :style="{ transform: `scaleX(${progress})` }" aria-hidden="true"></div>

    <!-- 返回顶部 -->
    <button class="to-top" :class="{ on: showTop }" aria-label="Back to top" @click="toTop">
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8">
        <path d="M12 19V5M5 12l7-7 7 7" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <header class="nav" :class="{ compact: scrolled }">
      <div class="bar">
        <router-link to="/shop" class="brand">
          <span class="mark">
            <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
              <path d="M12 3 L21 20 H16.9 L12 10.6 L7.1 20 H3 Z" fill="currentColor" />
            </svg>
          </span>
          <span class="brand-name">XUANKU</span>
        </router-link>

        <nav class="links">
          <router-link to="/shop" class="link" :class="{ on: route.path === '/shop' }">Products</router-link>
          <router-link to="/shop/orders" class="link" :class="{ on: route.path === '/shop/orders' }">
            Orders
          </router-link>
          <router-link to="/shop/cart" class="link" :class="{ on: route.path === '/shop/cart' }">
            Cart
            <span v-if="cart.count" :key="cart.count" class="badge">{{ cart.count }}</span>
          </router-link>
        </nav>

        <div class="acts">
          <router-link to="/shop/cart" class="cart-mini" aria-label="Cart">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7">
              <path d="M4 7h16l-1.4 9.2a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8L4 7Z" stroke-linejoin="round" />
              <path d="M9 7a3 3 0 0 1 6 0" stroke-linecap="round" />
            </svg>
            <span v-if="cart.count" :key="cart.count" class="mini-badge">{{ cart.count }}</span>
          </router-link>
          <button class="ghost-btn" @click="chatOpen = true">
            <span class="spark"></span>
            AI Concierge
          </button>
          <template v-if="store.isLogin">
            <router-link to="/shop/account" class="who" :class="{ on: route.path === '/shop/account' }">
              {{ store.user?.nickname || store.user?.username }}
            </router-link>
            <button class="out" @click="logout">Sign out</button>
          </template>
          <router-link v-else to="/shop/login" class="signin">Sign in</router-link>
        </div>
      </div>
    </header>

    <main class="main">
      <slot />
    </main>

    <footer class="foot">
      <div class="foot-inner">
        <div class="foot-brand">
          <span class="mark small">
            <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
              <path d="M12 3 L21 20 H16.9 L12 10.6 L7.1 20 H3 Z" fill="currentColor" />
            </svg>
          </span>
          <span>XUANKU</span>
        </div>
        <p class="tagline">A front-end-only e-commerce visual experiment.</p>

        <blockquote class="quote">
          “The details are not the details. They make the design.”
          <cite>— Charles Eames</cite>
        </blockquote>
        <div class="foot-meta">
          <span>© 2026 XUANKU</span>
          <span class="dot"></span>
          <span>Vue 3 · Vite · Static hosting</span>
        </div>
      </div>
    </footer>

    <AiDock v-model:open="chatOpen" />
    <CursorFx />
  </div>
</template>

<style scoped>
.shell {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  isolation: isolate;
}

/* ---------- 背景 ---------- */
.backdrop {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  background: var(--bg-canvas);
}

.aurora {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
}

.a1 {
  width: 46vw;
  height: 46vw;
  top: -16vw;
  left: 6vw;
  background: radial-gradient(circle, rgba(124, 108, 255, 0.1), transparent 66%);
  animation: drift-a 22s ease-in-out infinite;
}

.a2 {
  width: 38vw;
  height: 38vw;
  top: 2vw;
  right: -8vw;
  background: radial-gradient(circle, rgba(60, 200, 210, 0.09), transparent 68%);
  animation: drift-b 26s ease-in-out infinite;
}

.a3 {
  width: 34vw;
  height: 34vw;
  bottom: -18vw;
  left: 34vw;
  background: radial-gradient(circle, rgba(255, 140, 160, 0.06), transparent 70%);
  animation: drift-a 30s ease-in-out infinite reverse;
}

/* 细网格：只在中上部淡淡透出 */
.mesh {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(0, 0, 0, 0.022) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 0, 0, 0.022) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: radial-gradient(90% 60% at 50% 0%, #000 0%, transparent 78%);
  -webkit-mask-image: radial-gradient(90% 60% at 50% 0%, #000 0%, transparent 78%);
}

.vignette {
  display: none;
}

/* ---------- 顶部滚动进度线 ---------- */
.progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  z-index: 200;
  background: var(--text-1);
  transform-origin: 0 50%;
  transform: scaleX(0);
  pointer-events: none;
}

/* ---------- 导航 ---------- */
.nav {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 18px 24px;
  transition: padding 0.4s var(--ease-out);
}

.nav.compact {
  padding: 10px 24px;
}

.bar {
  max-width: 1180px;
  margin: 0 auto;
  height: 60px;
  padding: 0 10px 0 16px;
  display: flex;
  align-items: center;
  gap: 26px;
  border-radius: 999px;
  border: 1px solid transparent;
  transition: background-color 0.45s var(--ease-out), border-color 0.45s var(--ease-out),
    box-shadow 0.45s var(--ease-out), height 0.4s var(--ease-out);
}

.nav.compact .bar {
  height: 52px;
  background: rgba(255, 255, 255, 0.82);
  border-color: rgba(0, 0, 0, 0.07);
  box-shadow: inset 0 -0.5px 0 rgba(0, 0, 0, 0.05), 0 18px 40px -30px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(22px) saturate(160%);
  -webkit-backdrop-filter: blur(22px) saturate(160%);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  text-decoration: none;
  flex: none;
}

.mark {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 9px;
  color: #fff;
  background: var(--brand);
  transition: transform 0.5s var(--ease-out);
}

.brand:hover .mark {
  transform: rotate(-8deg) scale(1.05);
}

.mark.small {
  width: 22px;
  height: 22px;
  border-radius: 7px;
  color: #fff;
}

.brand-name {
  font-size: 13.5px;
  font-weight: 700;
  letter-spacing: 0.16em;
  color: var(--text-1);
}

.links {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.link {
  position: relative;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 13.5px;
  color: var(--text-2);
  text-decoration: none;
  transition: color 0.22s, background-color 0.22s;
}

.link:hover {
  color: var(--text-1);
  background: rgba(255, 255, 255, 0.05);
}

.link.on {
  color: var(--text-1);
}

.link.on::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 2px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  transform: translateX(-50%);
  background: var(--text-1);
}

.badge {
  display: inline-block;
  min-width: 16px;
  height: 16px;
  margin-left: 6px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--brand);
  color: #fff;
  font-size: 10.5px;
  font-weight: 600;
  line-height: 16px;
  text-align: center;
  vertical-align: 1px;
  animation: badge-pop 0.4s var(--ease-out);
}

@keyframes badge-pop {
  0% {
    transform: scale(0.4);
  }
  62% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

.acts {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: none;
}

/* 移动端专用购物车入口（桌面端已在上方导航里） */
.cart-mini {
  position: relative;
  display: none;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.6);
  color: var(--text-1);
}

.mini-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  min-width: 15px;
  height: 15px;
  padding: 0 3px;
  border-radius: 999px;
  background: var(--brand);
  color: #fff;
  font-size: 9.5px;
  font-weight: 600;
  line-height: 15px;
  text-align: center;
}

.ghost-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 15px;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: rgba(255, 255, 255, 0.6);
  color: var(--text-1);
  font-size: 12.5px;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.25s, background-color 0.25s, transform 0.25s var(--ease-out),
    box-shadow 0.25s;
}

.ghost-btn:hover {
  border-color: rgba(0, 0, 0, 0.32);
  background: #fff;
  transform: translateY(-1px);
  box-shadow: 0 10px 24px -14px rgba(0, 0, 0, 0.4);
}

.spark {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #34c759;
  box-shadow: 0 0 0 3px rgba(52, 199, 89, 0.16);
}

.who {
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: var(--text-2);
  text-decoration: none;
  transition: color 0.2s;
}

.who:hover,
.who.on {
  color: var(--text-1);
}

.out {
  border: none;
  background: none;
  padding: 0 2px;
  font-size: 12.5px;
  font-family: inherit;
  color: var(--text-3);
  cursor: pointer;
  transition: color 0.2s;
}

.out:hover {
  color: var(--danger);
}

.signin {
  display: inline-flex;
  align-items: center;
  height: 36px;
  padding: 0 18px;
  border-radius: 999px;
  background: #f5f5f7;
  color: var(--text-1);
  font-size: 12.5px;
  font-weight: 600;
  text-decoration: none;
  transition: background-color 0.25s, transform 0.25s var(--ease-out);
}

.signin:hover {
  background: #ececf0;
  transform: translateY(-1px);
}

/* ---------- 主体 / 页脚 ---------- */
.main {
  flex: 1;
  width: 100%;
}

.foot {
  margin-top: 140px;
  border-top: 1px solid var(--hairline);
}

.foot-inner {
  max-width: 1180px;
  margin: 0 auto;
  padding: 54px 32px 64px;
}

.foot-brand {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: var(--text-1);
}

.tagline {
  margin: 14px 0 0;
  font-size: 13px;
  color: var(--text-3);
}

/* 页脚引用语：Aesop 式的文化点缀 */
.quote {
  margin: 40px 0 0;
  max-width: 460px;
  font-family: Georgia, 'Times New Roman', serif;
  font-style: italic;
  font-size: 16px;
  line-height: 1.7;
  color: var(--text-2);
}

.quote cite {
  display: block;
  margin-top: 10px;
  font-family: inherit;
  font-style: normal;
  font-size: 11.5px;
  letter-spacing: 0.08em;
  color: var(--text-3);
}

/* 返回顶部：左下角，滚过一屏浮现 */
.to-top {
  position: fixed;
  left: 26px;
  bottom: 26px;
  z-index: 110;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--border-1);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(14px);
  color: var(--text-1);
  cursor: pointer;
  opacity: 0;
  transform: translateY(10px);
  pointer-events: none;
  box-shadow: 0 14px 32px -18px rgba(0, 0, 0, 0.35);
  transition: opacity 0.35s, transform 0.45s var(--ease-out), background-color 0.2s;
}

.to-top.on {
  opacity: 1;
  transform: none;
  pointer-events: auto;
}

.to-top:hover {
  background: var(--text-1);
  color: #fff;
}

.foot-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 30px;
  font-size: 11.5px;
  letter-spacing: 0.04em;
  color: #b3b3bc;
}

.dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #d8d8de;
}

@media (max-width: 860px) {
  .nav {
    padding: 12px 14px;
  }
  .nav.compact {
    padding: 8px 14px;
  }
  .bar {
    gap: 12px;
    padding: 0 8px 0 12px;
    height: 54px;
  }
  .links {
    display: none;
  }
  .cart-mini {
    display: grid;
  }
  .acts {
    margin-left: auto;
  }
  .ghost-btn {
    padding: 0 12px;
  }
  .brand-name {
    letter-spacing: 0.12em;
  }
  .foot {
    margin-top: 80px;
  }
  .foot-inner {
    padding: 40px 20px 48px;
  }
}

/* 更窄的屏幕上，导航里的 AI 入口让位给右下角常驻按钮 */
@media (max-width: 520px) {
  .ghost-btn {
    display: none;
  }
}
</style>
