import http from './http'

/**
 * 统一 API 模块：全部后端接口集中在此定义，页面只 import 方法不拼 URL
 */

export const authApi = {
  login: (data) => http.post('/auth/login', data),
  /** 管理端登录：后端会拒绝非 agent/admin 账号 */
  adminLogin: (data) => http.post('/auth/admin/login', data),
  register: (data) => http.post('/auth/register', data),
  logout: () => http.post('/auth/logout'),
  me: () => http.get('/auth/me'),
  updateProfile: (data) => http.put('/auth/profile', data),
  changePassword: (data) => http.put('/auth/password', data),
}

export const chatApi = {
  /** channel: SHOP 消费者 / CONSOLE 员工后台助手，两类会话互不干扰 */
  createSession: (channel = 'SHOP') => http.post('/chat/sessions', null, { params: { channel } }),
  sessions: (channel = 'SHOP') => http.get('/chat/sessions', { params: { channel } }),
  messages: (conversationId) => http.get('/chat/messages', { params: { conversationId } }),
  rate: (conversationId, rating) => http.post(`/chat/conversations/${conversationId}/rating`, { rating }),
}

export const kbApi = {
  documents: () => http.get('/kb/documents'),
  uploadDocument: (formData) =>
    http.post('/kb/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    }),
  deleteDocument: (id) => http.delete(`/kb/documents/${id}`),
  faqs: () => http.get('/kb/faqs'),
  createFaq: (body) => http.post('/kb/faqs', body),
  updateFaq: (id, body) => http.put(`/kb/faqs/${id}`, body),
  deleteFaq: (id) => http.delete(`/kb/faqs/${id}`),
}

export const ticketApi = {
  list: (params) => http.get('/tickets', { params }),
  create: (body) => http.post('/tickets', body),
  detail: (id) => http.get(`/tickets/${id}`),
  accept: (id) => http.post(`/tickets/${id}/accept`),
  resolve: (id, remark) => http.post(`/tickets/${id}/resolve`, { remark }),
  close: (id, remark) => http.post(`/tickets/${id}/close`, { remark }),
  reopen: (id, remark) => http.post(`/tickets/${id}/reopen`, { remark }),
}

export const deskApi = {
  conversations: (params) => http.get('/desk/conversations', { params }),
  convMessages: (id) => http.get(`/desk/conversations/${id}/messages`),
  convContext: (id) => http.get(`/desk/conversations/${id}/context`),
  questions: (status) => http.get('/desk/questions', { params: { status: status || undefined } }),
  resolveQuestion: (id, answer) => http.post(`/desk/questions/${id}/resolve`, { answer }),
  handoffs: () => http.get('/desk/handoffs'),
  acceptHandoff: (userId) => http.post(`/desk/handoffs/${userId}/accept`),
}

/** 运营后台：商品管理 + 客户档案 + AI 回答规则 */
export const adminApi = {
  products: (params) => http.get('/admin/products', { params }),
  updateProduct: (id, body) => http.put(`/admin/products/${id}`, body),
  customers: (params) => http.get('/admin/customers', { params }),
  customer: (id) => http.get(`/admin/customers/${id}`),
  aiRules: () => http.get('/admin/ai-rules'),
  updateAiRule: (ruleKey, body) => http.put(`/admin/ai-rules/${ruleKey}`, body),
  resetAiRule: (ruleKey) => http.post(`/admin/ai-rules/${ruleKey}/reset`),
  /** 同一条问题分别用出厂默认与当前规则回答，用于保存前对比 */
  trialAiRule: (ruleKey, body) =>
    http.post(`/admin/ai-rules/${ruleKey}/trial`, body, { timeout: 120000 }),
}

export const statsApi = {
  overview: () => http.get('/stats/overview'),
}

export const shopApi = {
  /** silent=true 时失败不弹提示，由调用方用本地快照兜底（纯静态部署场景） */
  products: (params, silent) => http.get('/shop/products', { params, silent }),
  product: (id, silent) => http.get(`/shop/products/${id}`, { silent }),
  categories: (silent) => http.get('/shop/categories', { silent }),
  createOrder: (body) => http.post('/shop/orders', body),
  orders: () => http.get('/shop/orders'),
  order: (id) => http.get(`/shop/orders/${id}`),
  pay: (id) => http.post(`/shop/orders/${id}/pay`),
  cancel: (id) => http.post(`/shop/orders/${id}/cancel`),
}
