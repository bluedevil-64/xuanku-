import { defineStore } from 'pinia'

const KEY = 'aidesk_auth'

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || { token: '', user: null }
  } catch {
    return { token: '', user: null }
  }
}

export const useUserStore = defineStore('user', {
  state: () => load(),
  getters: {
    isLogin: (s) => !!s.token,
  },
  actions: {
    setAuth(token, user) {
      this.token = token
      this.user = user
      localStorage.setItem(KEY, JSON.stringify({ token, user }))
    },
    /** 局部更新用户信息（改昵称后同步顶栏与本地缓存） */
    updateUser(patch) {
      this.user = { ...(this.user || {}), ...patch }
      localStorage.setItem(KEY, JSON.stringify({ token: this.token, user: this.user }))
    },
    clear() {
      this.token = ''
      this.user = null
      localStorage.removeItem(KEY)
    },
  },
})
