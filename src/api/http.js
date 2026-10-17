import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../stores/user'

const http = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

http.interceptors.request.use((config) => {
  const store = useUserStore()
  if (store.token) {
    config.headers['Authorization'] = store.token
  }
  return config
})

http.interceptors.response.use(
  (resp) => {
    const body = resp.data
    // 非 JSON 响应：多半是纯静态部署时 /api/* 被 SPA 回退成了 index.html，按「接口不可用」处理，
    // 不要拿 HTML 当业务报文去读 code，否则会弹出莫名其妙的「请求失败」
    if (!body || typeof body !== 'object' || body.code === undefined) {
      if (!resp.config?.silent) ElMessage.error('API unavailable')
      return Promise.reject(Object.assign(new Error('API unavailable'), { silent: resp.config?.silent }))
    }
    if (body.code !== '0') {
      if (body.code === '401') {
        const store = useUserStore()
        store.clear()
      }
      if (!resp.config?.silent) ElMessage.error(body.msg || 'Request failed')
      return Promise.reject(new Error(body.msg))
    }
    return body.data
  },
  (err) => {
    // silent 用于「调用方自己有兜底」的请求，避免静态展示站上满屏红条
    if (!err.config?.silent) {
      ElMessage.error(err.message || 'Network error')
    }
    return Promise.reject(err)
  },
)

export default http
