<script setup>
import { onBeforeUnmount, onMounted, provide, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authApi } from '../api'
import { useUserStore } from '../stores/user'
import { useCartStore } from '../stores/cart'
import AiDock from './AiDock.vue'

const route = useRoute()
const router = useRouter()
const store = useUserStore()
const cart = useCartStore()
const chatOpen = ref(false)
const scrolled = ref(false)

provide('openChat', () => {
  chatOpen.value = true
})

function onScroll() {
  scrolled.value = window.scrollY > 24
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
          <router-link to="/shop" class="link" :class="{ on: route.path === '/shop' }">商品</router-link>
          <router-link to="/shop/orders" class="link" :class="{ on: route.path === '/shop/orders' }">
            订单
          </router-link>
          <router-link to="/shop/cart" class="link" :class="{ on: route.path === '/shop/cart' }">
            购物车
            <span v-if="cart.count" :key="cart.count" class="badge">{{ cart.count }}</span>
          </router-link>
        </nav>

        <div class="acts">
          <router-link to="/shop/cart" class="cart-mini" aria-label="购物车">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7">
              <path d="M4 7h16l-1.4 9.2a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8L4 7Z" stroke-linejoin="round" />
              <path d="M9 7a3 3 0 0 1 6 0" stroke-linecap="round" />
            </svg>
            <span v-if="cart.count" :key="cart.count" class="mini-badge">{{ cart.count }}</span>
          </router-link>
          <button class="ghost-btn" @click="chatOpen = true">
            <span class="spark"></span>
            AI 导购
          </button>
          <template v-if="store.isLogin">
            <router-link to="/shop/account" class="who" :class="{ on: route.path === '/shop/account' }">
              {{ store.user?.nickname || store.user?.username }}
            </router-link>
            <button class="out" @click="logout">退出</button>
          </template>
          <router-link v-else to="/shop/login" class="signin">登录</router-link>
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
        <p class="tagline">一个纯前端的高规格电商视觉实验。</p>
        <div class="foot-meta">
          <span>© 2026 XUANKU</span>
          <span class="dot"></span>
          <span>Vue 3 · Vite · 静态托管</span>
        </div>
      </div>
    </footer>

    <AiDock v-model:open="chatOpen" />
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
  background: radial-gradient(120% 90% at 50% -20%, #17132b 0%, #0a0a10 42%, #050507 100%);
}

.aurora {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.55;
}

.a1 {
  width: 46vw;
  height: 46vw;
  top: -14vw;
  left: 8vw;
  background: radial-gradient(circle, rgba(124, 108, 255, 0.55), transparent 68%);
  animation: drift-a 22s ease-in-out infinite;
}

.a2 {
  width: 38vw;
  height: 38vw;
  top: 4vw;
  right: -6vw;
  background: radial-gradient(circle, rgba(60, 232, 210, 0.34), transparent 70%);
  animation: drift-b 26s ease-in-out infinite;
}

.a3 {
  width: 34vw;
  height: 34vw;
  bottom: -16vw;
  left: 34vw;
  background: radial-gradient(circle, rgba(255, 122, 184, 0.22), transparent 72%);
  animation: drift-a 30s ease-in-out infinite reverse;
}

/* 细网格：只在中上部淡淡透出 */
.mesh {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(rgba(255, 255, 255, 0.028) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.028) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: radial-gradient(90% 60% at 50% 0%, #000 0%, transparent 78%);
  -webkit-mask-image: radial-gradient(90% 60% at 50% 0%, #000 0%, transparent 78%);
}

.vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 80% at 50% 50%, transparent 40%, rgba(0, 0, 0, 0.55) 100%);
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
  background: rgba(10, 10, 15, 0.72);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 20px 50px -30px rgba(0, 0, 0, 0.95);
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
  color: #0a0a0f;
  background: var(--brand-gradient);
  box-shadow: 0 6px 18px -8px rgba(124, 108, 255, 0.9);
}

.mark.small {
  width: 22px;
  height: 22px;
  border-radius: 7px;
  color: #0a0a0f;
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
  background: var(--brand-gradient);
  box-shadow: 0 0 10px 1px rgba(124, 108, 255, 0.9);
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
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
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
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-1);
  font-size: 12.5px;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.25s, background-color 0.25s, transform 0.25s var(--ease-out);
}

.ghost-btn:hover {
  border-color: var(--brand-border);
  background: rgba(124, 108, 255, 0.12);
  transform: translateY(-1px);
}

.spark {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-2);
  box-shadow: 0 0 0 3px rgba(60, 232, 210, 0.16), 0 0 12px 1px rgba(60, 232, 210, 0.8);
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
  background: #f2f2f5;
  color: #0a0a0f;
  font-size: 12.5px;
  font-weight: 600;
  text-decoration: none;
  transition: transform 0.25s var(--ease-out), box-shadow 0.25s;
}

.signin:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 26px -12px rgba(255, 255, 255, 0.5);
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

.foot-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 30px;
  font-size: 11.5px;
  letter-spacing: 0.04em;
  color: #4c4c56;
}

.dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #3a3a44;
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
