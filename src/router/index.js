import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

const STAFF_ROLES = ['agent', 'admin']
const isStaff = (user) => STAFF_ROLES.includes(user?.role)

/** 只接受站内路径，避免 redirect 参数被用作开放跳转 */
function safeRedirect(value, fallback) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    ? value
    : fallback
}

const routes = [
  { path: '/', redirect: '/shop' },

  // ===== 客户商城（C 端）：可匿名浏览，可自助注册 =====
  {
    path: '/shop',
    name: 'shop',
    component: () => import('../views/shop/ShopHome.vue'),
    meta: { layout: 'shop', public: true },
  },
  {
    path: '/shop/p/:id',
    name: 'shop-product',
    component: () => import('../views/shop/ShopProduct.vue'),
    meta: { layout: 'shop', public: true },
  },
  {
    path: '/shop/cart',
    name: 'shop-cart',
    component: () => import('../views/shop/ShopCart.vue'),
    meta: { layout: 'shop', public: true },
  },
  {
    path: '/shop/login',
    name: 'shop-login',
    component: () => import('../views/shop/ShopLogin.vue'),
    meta: { layout: 'blank', public: true },
  },
  {
    path: '/shop/orders',
    name: 'shop-orders',
    component: () => import('../views/shop/ShopOrders.vue'),
    meta: { layout: 'shop' },
  },
  {
    path: '/shop/account',
    name: 'shop-account',
    component: () => import('../views/shop/Account.vue'),
    meta: { layout: 'shop' },
  },

  // ===== 客服管理端（B 端）：仅 agent / admin =====
  {
    path: '/admin/login',
    name: 'admin-login',
    component: () => import('../views/AdminLogin.vue'),
    meta: { layout: 'blank', public: true },
  },
  { path: '/admin', redirect: '/admin/chat' },
  {
    path: '/admin/chat',
    name: 'admin-chat',
    component: () => import('../views/Chat.vue'),
    meta: { layout: 'admin', portal: 'admin' },
  },
  {
    path: '/admin/kb',
    name: 'admin-kb',
    component: () => import('../views/Kb.vue'),
    meta: { layout: 'admin', portal: 'admin' },
  },
  {
    path: '/admin/rules',
    name: 'admin-rules',
    component: () => import('../views/AiRules.vue'),
    meta: { layout: 'admin', portal: 'admin' },
  },
  {
    path: '/admin/desk',
    name: 'admin-desk',
    component: () => import('../views/Desk.vue'),
    meta: { layout: 'admin', portal: 'admin' },
  },
  {
    path: '/admin/products',
    name: 'admin-products',
    component: () => import('../views/Products.vue'),
    meta: { layout: 'admin', portal: 'admin' },
  },
  {
    path: '/admin/customers',
    name: 'admin-customers',
    component: () => import('../views/Customers.vue'),
    meta: { layout: 'admin', portal: 'admin' },
  },
  {
    path: '/admin/stats',
    name: 'admin-stats',
    component: () => import('../views/Stats.vue'),
    meta: { layout: 'admin', portal: 'admin' },
  },

  // ===== 旧地址兼容 =====
  { path: '/login', redirect: '/shop/login' },
  { path: '/chat', redirect: '/admin/chat' },
  { path: '/kb', redirect: '/admin/kb' },
  { path: '/desk', redirect: '/admin/desk' },
  { path: '/stats', redirect: '/admin/stats' },
  { path: '/:pathMatch(.*)*', redirect: '/shop' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const store = useUserStore()
  const staff = isStaff(store.user)

  // 管理端：必须登录且具备客服/管理员角色
  if (to.meta.portal === 'admin') {
    if (!store.isLogin) {
      return { path: '/admin/login', query: { redirect: to.fullPath } }
    }
    if (!staff) {
      return { path: '/admin/login', query: { denied: '1' } }
    }
    return true
  }

  // 已登录的员工访问管理端登录页 → 直接进工作台
  if (to.name === 'admin-login') {
    return store.isLogin && staff ? '/admin/chat' : true
  }

  // 已登录的客户访问商城登录页 → 回商城
  if (to.name === 'shop-login') {
    return store.isLogin ? safeRedirect(to.query.redirect, '/shop') : true
  }

  // 其余需要登录的页面（如我的订单）走商城登录
  if (to.meta.public !== true && !store.isLogin) {
    return { path: '/shop/login', query: { redirect: to.fullPath } }
  }
  return true
})

export default router
