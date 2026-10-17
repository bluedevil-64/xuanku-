<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { authApi } from '../../api'
import { useUserStore } from '../../stores/user'

const route = useRoute()
const router = useRouter()
const store = useUserStore()

const tab = ref('login')
const loading = ref(false)

const loginForm = reactive({ username: '', password: '' })
const regForm = reactive({ username: '', nickname: '', password: '' })

function next() {
  const redirect = route.query.redirect
  router.push(typeof redirect === 'string' && redirect.startsWith('/') ? redirect : '/shop')
}

async function doLogin() {
  if (!loginForm.username || !loginForm.password) {
    ElMessage.warning('请输入账号和密码')
    return
  }
  loading.value = true
  try {
    const data = await authApi.login(loginForm)
    store.setAuth(data.token, data.user)
    ElMessage.success('登录成功')
    next()
  } finally {
    loading.value = false
  }
}

async function doRegister() {
  if (!regForm.username || !regForm.password) {
    ElMessage.warning('请输入账号和密码')
    return
  }
  loading.value = true
  try {
    const data = await authApi.register(regForm)
    store.setAuth(data.token, data.user)
    ElMessage.success('注册成功，欢迎')
    next()
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth">
    <div class="panel">
      <router-link to="/shop" class="brand">
        <img src="/favicon.svg" class="mark" alt="XUANKU" width="28" height="28" />
        <span>XUANKU</span>
      </router-link>

      <h1>欢迎回来</h1>
      <p class="lede">这里是一个纯静态的视觉展示站，账号体系需要后端支持。</p>

      <div class="tabs">
        <button :class="{ on: tab === 'login' }" @click="tab = 'login'">登录</button>
        <button :class="{ on: tab === 'register' }" @click="tab = 'register'">注册</button>
      </div>

      <form v-if="tab === 'login'" @submit.prevent="doLogin">
        <input v-model.trim="loginForm.username" placeholder="用户名" autocomplete="username" />
        <input
          v-model="loginForm.password"
          type="password"
          placeholder="密码"
          autocomplete="current-password"
          @keyup.enter="doLogin"
        />
        <button class="submit" type="submit" :disabled="loading">
          {{ loading ? '登录中…' : '登录' }}
        </button>
      </form>

      <form v-else @submit.prevent="doRegister">
        <input v-model.trim="regForm.username" placeholder="用户名（3-32 位）" />
        <input v-model.trim="regForm.nickname" placeholder="昵称（选填）" />
        <input
          v-model="regForm.password"
          type="password"
          placeholder="密码（6-32 位）"
          autocomplete="new-password"
          @keyup.enter="doRegister"
        />
        <button class="submit" type="submit" :disabled="loading">
          {{ loading ? '注册中…' : '注册并登录' }}
        </button>
      </form>

      <p class="foot">继续即表示同意服务条款与隐私政策</p>
    </div>
  </div>
</template>

<style scoped>
.auth {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  background: radial-gradient(70% 50% at 50% -10%, rgba(124, 108, 255, 0.18), transparent 62%),
    radial-gradient(50% 42% at 88% 88%, rgba(60, 232, 210, 0.1), transparent 66%), var(--bg-canvas);
  box-sizing: border-box;
}

.panel {
  width: 400px;
  max-width: 100%;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 48px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.3px;
  color: var(--text-1);
  text-decoration: none;
}

.mark {
  width: 28px;
  height: 28px;
  flex: none;
  display: block;
}

h1 {
  margin: 0;
  font-size: 38px;
  font-weight: 600;
  letter-spacing: -1.5px;
  color: var(--text-1);
}

.lede {
  margin: 12px 0 34px;
  font-size: 14.5px;
  line-height: 1.6;
  color: var(--text-3);
}

.tabs {
  display: flex;
  gap: 2px;
  padding: 3px;
  margin-bottom: 26px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.045);
}

.tabs button {
  flex: 1;
  height: 34px;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: var(--text-3);
  font-size: 13.5px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.24s cubic-bezier(0.32, 0.72, 0, 1), color 0.2s,
    box-shadow 0.2s;
}

.tabs button.on {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-1);
  box-shadow: 0 1px 3px rgba(255, 255, 255, 0.1);
}

form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

input {
  height: 50px;
  padding: 0 16px;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.045);
  color: var(--text-1);
  font-size: 14.5px;
  font-family: inherit;
  outline: none;
  transition: background-color 0.2s, box-shadow 0.2s;
}

input::placeholder {
  color: var(--text-3);
}

input:focus {
  background: rgba(255, 255, 255, 0.05);
  box-shadow: inset 0 0 0 1px #1d1d1f;
}

.submit {
  height: 50px;
  margin-top: 10px;
  border: none;
  border-radius: 999px;
  background: #f4f4f7;
  color: #08080c;
  font-size: 15px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.2s, opacity 0.2s;
}

.submit:not(:disabled):hover {
  background: #ffffff;
}

.submit:disabled {
  opacity: 0.45;
  cursor: default;
}

.foot {
  margin: 24px 0 0;
  font-size: 11.5px;
  color: #4f4f5b;
  text-align: center;
}

@media (max-width: 520px) {
  .brand {
    margin-bottom: 32px;
  }
  h1 {
    font-size: 30px;
    letter-spacing: -1px;
  }
}
</style>
