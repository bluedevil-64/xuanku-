import { defineStore } from 'pinia'

const KEY = 'aidesk_cart'

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY))
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

/**
 * 购物车：仅存前端（localStorage），下单时才把 productId + 数量提交后端
 * item: { productId, name, subtitle, price, tone, stock, quantity }
 */
export const useCartStore = defineStore('cart', {
  state: () => ({ items: load() }),

  getters: {
    count: (s) => s.items.reduce((n, i) => n + i.quantity, 0),
    amount: (s) => s.items.reduce((n, i) => n + Number(i.price) * i.quantity, 0),
  },

  actions: {
    persist() {
      localStorage.setItem(KEY, JSON.stringify(this.items))
    },
    add(product, quantity = 1) {
      const exist = this.items.find((i) => i.productId === product.id)
      if (exist) {
        exist.quantity = Math.min(exist.quantity + quantity, product.stock ?? 99)
      } else {
        this.items.push({
          productId: product.id,
          name: product.name,
          subtitle: product.subtitle,
          price: product.price,
          tone: product.tone,
          image: product.image,
          stock: product.stock,
          quantity,
        })
      }
      this.persist()
    },
    setQty(productId, quantity) {
      const item = this.items.find((i) => i.productId === productId)
      if (!item) return
      const max = item.stock ?? 99
      item.quantity = Math.max(1, Math.min(quantity, max))
      this.persist()
    },
    remove(productId) {
      this.items = this.items.filter((i) => i.productId !== productId)
      this.persist()
    },
    clear() {
      this.items = []
      this.persist()
    },
  },
})
