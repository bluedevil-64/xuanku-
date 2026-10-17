<script setup>
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { authApi } from '../api'
import { useUserStore } from '../stores/user'

const route = useRoute()
const router = useRouter()
const store = useUserStore()

const loading = ref(false)
const form = reactive({ username: '', password: '' })

const denied = computed(() => route.query.denied === '1')

async function submit() {
  if (!form.username || !form.password) {
    ElMessage.warning('请输入账号和密码')
    return
  }
  loading.value = true
  try {
    const data = await authApi.adminLogin(form)
    if (!['agent', 'admin'].includes(data.user?.role)) {
      ElMessage.error('该账号无后台访问权限')
      return
    }
    store.setAuth(data.token, data.user)
    ElMessage.success('登录成功')
    const redirect = route.query.redirect
    router.push(typeof redirect === 'string' && redirect.startsWith('/admin') ? redirect : '/admin/chat')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth">
    <div class="panel">
      <div class="brand">
        <img src="/favicon.svg" class="mark" alt="AiDesk" width="28" height="28" />
        <span>AiDesk Console</span>
      </div>

      <h1>员工登录</h1>
      <p class="lede">客服与管理员账号专用入口</p>

      <p v-if="denied" class="denied">当前账号无后台权限，请改用员工账号登录</p>

      <form @submit.prevent="submit">
        <input v-model.trim="form.username" placeholder="员工账号" autocomplete="username" />
        <input
          v-model="form.password"
          type="password"
          placeholder="密码"
          autocomplete="current-password"
          @keyup.enter="submit"
        />
        <button class="submit" type="submit" :disabled="loading">
          {{ loading ? '验证中…' : '进入工作台' }}
        </button>
      </form>

      <p class="hint">演示账号 admin / admin123</p>
    </div>

    <p class="foot">AiDesk · 客服与工单系统</p>
  </div>
</template>

<style scoped>
.auth {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 40px;
  padding: 40px 20px;
  box-sizing: border-box;
  background: #fff;
}

.panel {
  width: 400px;
  max-width: 100%;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 44px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.3px;
  color: #1d1d1f;
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
  color: #1d1d1f;
}

.lede {
  margin: 12px 0 30px;
  font-size: 14.5px;
  color: #86868b;
}

.denied {
  margin: 0 0 18px;
  padding: 11px 14px;
  border-radius: 12px;
  background: #fff5e6;
  font-size: 12.5px;
  line-height: 1.5;
  color: #94570a;
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
  background: #f5f5f7;
  color: #1d1d1f;
  font-size: 14.5px;
  font-family: inherit;
  outline: none;
  transition: background-color 0.2s, box-shadow 0.2s;
}

input::placeholder {
  color: #a1a1a6;
}

input:focus {
  background: #fff;
  box-shadow: inset 0 0 0 1px #1d1d1f;
}

.submit {
  height: 50px;
  margin-top: 10px;
  border: none;
  border-radius: 999px;
  background: #1d1d1f;
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.2s, opacity 0.2s;
}

.submit:not(:disabled):hover {
  background: #000;
}

.submit:disabled {
  opacity: 0.45;
  cursor: default;
}

.hint {
  margin: 22px 0 0;
  font-size: 11.5px;
  color: #b0b0b6;
  text-align: center;
}

.foot {
  margin: 0;
  font-size: 11.5px;
  color: #b0b0b6;
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
