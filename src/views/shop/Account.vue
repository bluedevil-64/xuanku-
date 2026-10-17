<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { authApi } from '../../api'
import { useUserStore } from '../../stores/user'

const router = useRouter()
const store = useUserStore()

const user = computed(() => store.user || {})
const initial = computed(() => (user.value.nickname || user.value.username || 'U').slice(0, 1))

const nickname = ref(user.value.nickname || '')
const saving = ref(false)
const changing = ref(false)
const pwd = reactive({ old: '', next: '', confirm: '' })

onMounted(async () => {
  // 进页面拉一次最新资料，避免本地缓存过期
  try {
    const me = await authApi.me()
    store.updateUser(me)
    nickname.value = me.nickname || ''
  } catch {
    // 拉取失败时沿用本地缓存
  }
})

async function saveNickname() {
  const name = nickname.value.trim()
  if (!name) {
    ElMessage.warning('昵称不能为空')
    return
  }
  if (name === user.value.nickname) return
  saving.value = true
  try {
    const updated = await authApi.updateProfile({ nickname: name })
    store.updateUser(updated)
    nickname.value = updated.nickname
    ElMessage.success('昵称已更新')
  } catch {
    // 失败提示由请求拦截器统一弹出
  } finally {
    saving.value = false
  }
}

async function savePassword() {
  if (!pwd.old || !pwd.next) {
    ElMessage.warning('请填写原密码和新密码')
    return
  }
  if (pwd.next.length < 6 || pwd.next.length > 32) {
    ElMessage.warning('新密码长度需为 6-32 位')
    return
  }
  if (pwd.next !== pwd.confirm) {
    ElMessage.warning('两次输入的新密码不一致')
    return
  }
  changing.value = true
  try {
    await authApi.changePassword({ oldPassword: pwd.old, newPassword: pwd.next })
    pwd.old = ''
    pwd.next = ''
    pwd.confirm = ''
    ElMessage.success('密码已修改')
  } catch {
    // 失败提示由请求拦截器统一弹出（如原密码不正确）
  } finally {
    changing.value = false
  }
}

async function logout() {
  try {
    await authApi.logout()
  } catch {
    // 忽略接口异常，本地照常清理
  }
  store.clear()
  router.push('/shop')
}
</script>

<template>
  <div class="page">
    <header class="profile">
      <div class="avatar">{{ initial }}</div>
      <div>
        <h1>{{ user.nickname || user.username }}</h1>
        <p>@{{ user.username }} · 注册于 {{ user.createTime || '—' }}</p>
      </div>
    </header>

    <section class="block">
      <h2>资料</h2>

      <div class="field">
        <label for="nickname">昵称</label>
        <input id="nickname" v-model="nickname" maxlength="20" placeholder="最多 20 个字符" />
        <button
          class="save"
          :disabled="saving || !nickname.trim() || nickname.trim() === user.nickname"
          @click="saveNickname"
        >
          {{ saving ? '保存中…' : '保存' }}
        </button>
      </div>

      <div class="field readonly">
        <label>用户名</label>
        <span>{{ user.username }}</span>
        <em>不可修改</em>
      </div>
    </section>

    <section class="block">
      <h2>修改密码</h2>

      <div class="field">
        <label for="pwd-old">原密码</label>
        <input id="pwd-old" v-model="pwd.old" type="password" autocomplete="current-password" />
      </div>
      <div class="field">
        <label for="pwd-new">新密码</label>
        <input
          id="pwd-new"
          v-model="pwd.next"
          type="password"
          placeholder="6-32 位"
          autocomplete="new-password"
        />
      </div>
      <div class="field">
        <label for="pwd-confirm">确认新密码</label>
        <input
          id="pwd-confirm"
          v-model="pwd.confirm"
          type="password"
          autocomplete="new-password"
        />
      </div>

      <button class="primary" :disabled="changing" @click="savePassword">
        {{ changing ? '提交中…' : '修改密码' }}
      </button>
    </section>

    <section class="block links">
      <h2>快捷</h2>
      <router-link to="/shop/orders">我的订单 →</router-link>
      <router-link to="/shop/cart">购物车 →</router-link>
      <button class="quiet" @click="logout">退出登录</button>
    </section>
  </div>
</template>

<style scoped>
.page {
  max-width: 720px;
  margin: 0 auto;
  padding: 64px 40px 96px;
}

.profile {
  display: flex;
  align-items: center;
  gap: 20px;
  padding-bottom: 36px;
}

.avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: #f4f4f7;
  color: #08080c;
  font-size: 24px;
  font-weight: 500;
  flex: none;
}

.profile h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -0.8px;
  color: var(--text-1);
}

.profile p {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--text-3);
}

.block {
  padding: 32px 0;
  border-top: 1px solid var(--hairline);
}

.block h2 {
  margin: 0 0 20px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-3);
}

.field {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.field label {
  width: 96px;
  flex: none;
  font-size: 13.5px;
  color: var(--text-2);
}

.field input {
  flex: 1;
  height: 44px;
  padding: 0 14px;
  border: none;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.045);
  color: var(--text-1);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: background-color 0.2s, box-shadow 0.2s;
}

.field input::placeholder {
  color: var(--text-3);
}

.field input:focus {
  background: rgba(255, 255, 255, 0.05);
  box-shadow: inset 0 0 0 1px #1d1d1f;
}

.field.readonly span {
  flex: 1;
  font-size: 14px;
  color: var(--text-1);
}

.field.readonly em {
  font-style: normal;
  font-size: 12px;
  color: var(--text-3);
}

.save {
  height: 44px;
  padding: 0 20px;
  border: none;
  border-radius: 999px;
  background: #f4f4f7;
  color: #08080c;
  font-size: 13.5px;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.2s, opacity 0.2s;
}

.save:disabled {
  opacity: 0.28;
  cursor: default;
}

.save:not(:disabled):hover {
  background: #ffffff;
}

.primary {
  width: 100%;
  height: 46px;
  margin-top: 8px;
  border: none;
  border-radius: 999px;
  background: #f4f4f7;
  color: #08080c;
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.2s, opacity 0.2s;
}

.primary:disabled {
  opacity: 0.45;
  cursor: default;
}

.primary:not(:disabled):hover {
  background: #ffffff;
}

.links {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 24px;
}

.links h2 {
  width: 100%;
  margin-bottom: 4px;
}

.links a {
  font-size: 14px;
  color: var(--text-1);
  text-decoration: none;
  border-bottom: 0.5px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 2px;
  transition: border-color 0.2s;
}

.links a:hover {
  border-color: var(--text-1);
}

.quiet {
  border: none;
  background: none;
  padding: 0;
  font-size: 14px;
  font-family: inherit;
  color: var(--text-3);
  cursor: pointer;
  transition: color 0.2s;
}

.quiet:hover {
  color: var(--text-1);
}

@media (max-width: 640px) {
  .page {
    padding: 40px 20px 64px;
  }
  .field {
    flex-wrap: wrap;
    gap: 8px;
  }
  .field label {
    width: 100%;
  }
  .save {
    width: 100%;
  }
}
</style>
