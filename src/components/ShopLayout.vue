<script setup>
import { provide, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authApi } from '../api'
import { useUserStore } from '../stores/user'
import { useCartStore } from '../stores/cart'
import ShopChat from './ShopChat.vue'

const route = useRoute()
const router = useRouter()
const store = useUserStore()
const cart = useCartStore()
const chatOpen = ref(false)

provide('openChat', () => {
  chatOpen.value = true
})

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
  <div class="shop-shell">
    <header class="shop-header">
      <div class="inner">
        <router-link to="/shop" class="brand">
          <img src="/favicon.svg" class="brand-mark" alt="AiDesk" width="28" height="28" />
          <span class="brand-name">AiDesk Store</span>
        </router-link>

        <nav class="shop-nav">
          <router-link to="/shop" class="link" :class="{ on: route.path === '/shop' }">全部商品</router-link>
          <router-link to="/shop/orders" class="link" :class="{ on: route.path === '/shop/orders' }">我的订单</router-link>
        </nav>

        <div class="actions">
          <router-link to="/shop/cart" class="cart-link" :class="{ on: route.path === '/shop/cart' }">
            购物车
            <span v-if="cart.count" :key="cart.count" class="badge">{{ cart.count }}</span>
          </router-link>
          <template v-if="store.isLogin">
            <router-link to="/shop/account" class="who" :class="{ on: route.path === '/shop/account' }">
              {{ store.user?.nickname || store.user?.username }}
            </router-link>
            <button class="logout" @click="logout">退出</button>
          </template>
          <router-link v-else to="/shop/login" class="login-link">登录 / 注册</router-link>
        </div>
      </div>
    </header>

    <main class="shop-main">
      <slot />
    </main>

    <footer class="shop-footer">
      <div class="inner">
        <span>© 2026 AiDesk Store · 选好物，问 AI</span>
        <span class="muted">商品参数与订单数据由 AiDesk 提供</span>
      </div>
    </footer>

    <button class="cs-fab" @click="chatOpen = true">
      <span class="dot"></span>
      在线客服
    </button>

    <ShopChat v-model:open="chatOpen" />
  </div>
</template>

<style scoped>
.shop-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.shop-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.93);
  backdrop-filter: saturate(180%) blur(12px);
  -webkit-backdrop-filter: saturate(180%) blur(12px);
  box-shadow: inset 0 -0.5px 0 rgba(0, 0, 0, 0.08);
}

.shop-header .inner {
  max-width: 1240px;
  margin: 0 auto;
  height: 64px;
  padding: 0 40px;
  display: flex;
  align-items: center;
  gap: 40px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  flex: none;
}

.brand-mark {
  width: 27px;
  height: 27px;
  flex: none;
  display: block;
}

.brand-name {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.3px;
  color: #1d1d1f;
}

.shop-nav {
  display: flex;
  align-items: center;
  gap: 28px;
  flex: 1;
}

.link {
  font-size: 13.5px;
  color: #6e6e73;
  text-decoration: none;
  letter-spacing: -0.1px;
  transition: color 0.2s;
}

.link:hover,
.link.on {
  color: #1d1d1f;
}

.actions {
  display: flex;
  align-items: center;
  gap: 20px;
}

.cart-link {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13.5px;
  color: #6e6e73;
  text-decoration: none;
  transition: color 0.2s;
}

.cart-link:hover,
.cart-link.on {
  color: #1d1d1f;
}

.badge {
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 999px;
  background: #1d1d1f;
  color: #fff;
  font-size: 10.5px;
  font-weight: 600;
  line-height: 16px;
  text-align: center;
  animation: badge-pop 0.36s cubic-bezier(0.32, 0.72, 0, 1);
}

@keyframes badge-pop {
  0% {
    transform: scale(0.55);
  }
  60% {
    transform: scale(1.16);
  }
  100% {
    transform: scale(1);
  }
}

.who {
  font-size: 13.5px;
  color: #1d1d1f;
  text-decoration: none;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: opacity 0.2s;
}

.who:hover,
.who.on {
  opacity: 0.6;
}

.login-link {
  font-size: 13.5px;
  color: #1d1d1f;
  text-decoration: none;
  padding: 6px 14px;
  border-radius: 999px;
  background: #f5f5f7;
  transition: background-color 0.2s;
}

.login-link:hover {
  background: #e8e8ed;
}

.logout {
  border: none;
  background: none;
  padding: 0;
  font-size: 13px;
  font-family: inherit;
  color: #a1a1a6;
  cursor: pointer;
  transition: color 0.2s;
}

.logout:hover {
  color: #1d1d1f;
}

.shop-main {
  flex: 1;
  width: 100%;
}

.shop-footer {
  border-top: 0.5px solid rgba(0, 0, 0, 0.08);
  margin-top: 96px;
}

.shop-footer .inner {
  max-width: 1240px;
  margin: 0 auto;
  /* 右侧留出悬浮客服按钮的位置，避免文字被遮挡 */
  padding: 32px 148px 48px 40px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  font-size: 12px;
  color: #86868b;
}

.muted {
  color: #a1a1a6;
}

/* 右下角客服入口 */
.cs-fab {
  position: fixed;
  right: 28px;
  bottom: 28px;
  z-index: 90;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 46px;
  padding: 0 20px;
  border: none;
  border-radius: 999px;
  background: #1d1d1f;
  color: #fff;
  font-size: 13.5px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  box-shadow: 0 12px 32px -10px rgba(0, 0, 0, 0.45);
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1), background-color 0.2s;
}

.cs-fab:hover {
  transform: translateY(-2px);
  background: #000;
}

.cs-fab:active {
  transform: scale(0.97);
}

.cs-fab .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #34c759;
  box-shadow: 0 0 0 3px rgba(52, 199, 89, 0.25);
}

@media (max-width: 860px) {
  .shop-header .inner {
    padding: 0 20px;
    gap: 20px;
  }
  .brand-name,
  .shop-nav {
    display: none;
  }
  .actions {
    margin-left: auto;
  }
  .shop-footer .inner {
    padding: 28px 20px 40px;
    flex-direction: column;
  }
}
</style>
