<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { authApi } from '../api'
import { useUserStore } from '../stores/user'

const router = useRouter()
const route = useRoute()
const store = useUserStore()

const navs = [
  { path: '/admin/chat', label: 'AI 对话' },
  { path: '/admin/desk', label: '服务台' },
  { path: '/admin/kb', label: '知识库' },
  { path: '/admin/rules', label: 'AI 规则' },
  { path: '/admin/products', label: '商品' },
  { path: '/admin/customers', label: '客户' },
  { path: '/admin/stats', label: '看板' },
]

const displayName = computed(() => store.user?.nickname || store.user?.username || '')
const initial = computed(() => (displayName.value || 'U').slice(0, 1).toUpperCase())

async function logout() {
  try {
    await authApi.logout()
  } catch {
    // 忽略登出接口异常，本地照常清理
  }
  store.clear()
  router.push('/admin/login')
}
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="app-brand">
        <img src="/favicon.svg" class="brand-mark" alt="AiDesk" width="28" height="28" />
        <span class="app-title">AiDesk Console</span>
      </div>

      <nav class="app-nav">
        <router-link
          v-for="n in navs"
          :key="n.path"
          :to="n.path"
          class="nav-link"
          :class="{ on: route.path === n.path }"
        >
          {{ n.label }}
        </router-link>
      </nav>

      <div class="user-area">
        <router-link to="/shop" class="shop-link">商城前台</router-link>
        <span class="user-avatar">{{ initial }}</span>
        <span class="nickname">{{ displayName }}</span>
        <button class="logout-btn" @click="logout">退出</button>
      </div>
    </header>

    <main class="app-main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.app-header {
  flex: none;
  display: flex;
  align-items: center;
  gap: 44px;
  height: 64px;
  padding: 0 40px;
  position: sticky;
  top: 0;
  z-index: 100;
  background: #fff;
  box-shadow: inset 0 -0.5px 0 rgba(0, 0, 0, 0.08);
}

.app-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.brand-mark {
  width: 27px;
  height: 27px;
  flex: none;
  display: block;
}

.app-title {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.3px;
  color: #1d1d1f;
  white-space: nowrap;
}

.app-nav {
  display: flex;
  align-items: center;
  gap: 30px;
  flex: 1;
}

.nav-link {
  position: relative;
  padding: 6px 0;
  font-size: 13.5px;
  color: #6e6e73;
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.2s;
}

.nav-link:hover {
  color: #1d1d1f;
}

.nav-link.on {
  color: #1d1d1f;
  font-weight: 600;
}

.user-area {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.shop-link {
  font-size: 13px;
  color: #1d1d1f;
  text-decoration: none;
  padding: 6px 14px;
  border-radius: 999px;
  background: #f5f5f7;
  transition: background-color 0.2s;
}

.shop-link:hover {
  background: #ededf0;
}

.user-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #1d1d1f;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  flex: none;
}

.nickname {
  font-size: 13px;
  color: #6e6e73;
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logout-btn {
  border: none;
  background: none;
  padding: 0;
  font-size: 13px;
  font-family: inherit;
  color: #a1a1a6;
  cursor: pointer;
  transition: color 0.2s;
}

.logout-btn:hover {
  color: #1d1d1f;
}

.app-main {
  flex: 1;
  min-height: 0;
  padding: 28px 40px 40px;
  overflow: auto;
}

.app-main > * {
  animation: page-in 0.34s var(--ease-ios) both;
}

@media (max-width: 1000px) {
  .app-header {
    gap: 20px;
    padding: 0 20px;
  }
  .app-title,
  .nickname {
    display: none;
  }
  .app-nav {
    gap: 18px;
  }
  .nav-link {
    font-size: 13px;
  }
  .app-main {
    padding: 20px 20px 32px;
  }
}
</style>
