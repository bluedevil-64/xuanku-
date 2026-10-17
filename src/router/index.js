import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user'

/** 只接受站内路径，避免 redirect 参数被用作开放跳转 */
function safeRedirect(value, fallback) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    ? value
    : fallback
}

const routes = [
  { path: '/', redirect: '/shop' },

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

  { path: '/:pathMatch(.*)*', redirect: '/shop' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: (to, from, saved) => saved || { top: 0 },
})

router.beforeEach((to) => {
  const store = useUserStore()

  // 已登录的客户访问登录页 → 回商城
  if (to.name === 'shop-login') {
    return store.isLogin ? safeRedirect(to.query.redirect, '/shop') : true
  }

  // 需要登录的页面（我的订单、个人中心）走商城登录
  if (to.meta.public !== true && !store.isLogin) {
    return { path: '/shop/login', query: { redirect: to.fullPath } }
  }
  return true
})

export default router
