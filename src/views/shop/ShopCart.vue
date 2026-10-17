<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { shopApi } from '../../api'
import { useCartStore } from '../../stores/cart'
import { useUserStore } from '../../stores/user'

const router = useRouter()
const cart = useCartStore()
const store = useUserStore()

const submitting = ref(false)
const form = reactive({ name: '', phone: '', address: '' })

const total = computed(() => cart.amount)

function money(v) {
  return Number(v ?? 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

async function submit() {
  if (!cart.items.length) return
  if (!store.isLogin) {
    router.push({ path: '/login', query: { redirect: '/shop/cart' } })
    return
  }
  if (!form.name.trim() || !form.phone.trim() || !form.address.trim()) {
    ElMessage.warning('请填写完整的收货信息')
    return
  }
  submitting.value = true
  try {
    const order = await shopApi.createOrder({
      items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      receiverName: form.name.trim(),
      receiverPhone: form.phone.trim(),
      receiverAddress: form.address.trim(),
    })
    cart.clear()
    ElMessage.success(`下单成功，订单号 ${order.orderNo}`)
    router.push('/shop/orders')
  } catch {
    // 库存不足等失败由请求拦截器提示
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="page">
    <header class="head">
      <h1>购物车</h1>
      <p v-if="cart.items.length">共 {{ cart.count }} 件</p>
    </header>

    <div v-if="!cart.items.length" class="empty">
      <p>购物车还是空的</p>
      <router-link to="/shop">去挑点什么 →</router-link>
    </div>

    <div v-else class="layout">
      <ul class="list">
        <li v-for="i in cart.items" :key="i.productId" class="item">
          <router-link :to="`/shop/p/${i.productId}`" class="thumb" :class="`tone-${i.tone}`">
            <img v-if="i.image" :src="i.image" :alt="i.name" class="thumb-img" />
            <span v-else class="mini"></span>
          </router-link>

          <div class="detail">
            <router-link :to="`/shop/p/${i.productId}`" class="name">{{ i.name }}</router-link>
            <p class="sub">{{ i.subtitle }}</p>
            <p class="unit">单价 ¥{{ money(i.price) }}</p>
          </div>

          <div class="qty">
            <button @click="cart.setQty(i.productId, i.quantity - 1)">−</button>
            <span>{{ i.quantity }}</span>
            <button @click="cart.setQty(i.productId, i.quantity + 1)">+</button>
          </div>

          <div class="line-total">¥{{ money(Number(i.price) * i.quantity) }}</div>

          <button class="del" @click="cart.remove(i.productId)">移除</button>
        </li>
      </ul>

      <aside class="summary">
        <div class="row">
          <span>商品合计</span>
          <span>¥{{ money(total) }}</span>
        </div>
        <div class="row">
          <span>运费</span>
          <span class="free">免运费</span>
        </div>
        <div class="row total">
          <span>应付</span>
          <span>¥{{ money(total) }}</span>
        </div>

        <div class="form">
          <label>收货信息</label>
          <input v-model="form.name" placeholder="收货人" />
          <input v-model="form.phone" placeholder="手机号" />
          <input v-model="form.address" placeholder="收货地址" />
        </div>

        <button class="submit" :disabled="submitting" @click="submit">
          {{ submitting ? '提交中…' : store.isLogin ? '提交订单' : '登录后提交订单' }}
        </button>
        <p class="tip">下单后可让在线客服帮你查订单进度</p>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 1240px;
  margin: 0 auto;
  padding: 64px 40px 40px;
}

.head {
  display: flex;
  align-items: baseline;
  gap: 14px;
  margin-bottom: 40px;
}

.head h1 {
  margin: 0;
  font-size: 40px;
  font-weight: 600;
  letter-spacing: -1.6px;
  color: #1d1d1f;
}

.head p {
  margin: 0;
  font-size: 13px;
  color: #86868b;
}

.empty {
  padding: 96px 0 120px;
  text-align: center;
}

.empty p {
  margin: 0 0 18px;
  font-size: 16px;
  color: #86868b;
}

.empty a {
  font-size: 14px;
  color: #1d1d1f;
  text-decoration: none;
  border-bottom: 0.5px solid #1d1d1f;
  padding-bottom: 2px;
}

.layout {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 56px;
  align-items: start;
}

.list {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 0.5px solid rgba(0, 0, 0, 0.08);
}

.item {
  display: grid;
  grid-template-columns: 92px 1fr auto 100px auto;
  align-items: center;
  gap: 20px;
  padding: 22px 0;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.08);
}

.thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 92px;
  height: 92px;
  border-radius: 16px;
  text-decoration: none;
  overflow: hidden;
}

.mini {
  display: block;
  width: 40%;
  aspect-ratio: 1;
  border-radius: 50%;
  background-image: linear-gradient(155deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.3));
  box-shadow: 0 10px 20px -10px rgba(0, 0, 0, 0.3);
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detail {
  min-width: 0;
}

.name {
  font-size: 15px;
  font-weight: 500;
  color: #1d1d1f;
  text-decoration: none;
  letter-spacing: -0.2px;
}

.name:hover {
  opacity: 0.65;
}

.sub {
  margin: 5px 0 0;
  font-size: 12.5px;
  color: #86868b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unit {
  margin: 8px 0 0;
  font-size: 12.5px;
  color: #a1a1a6;
}

.qty {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 34px;
  padding: 0 3px;
  border-radius: 999px;
  background: #f5f5f7;
}

.qty button {
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #1d1d1f;
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.2s;
}

.qty button:hover {
  background: #e8e8ed;
}

.qty span {
  min-width: 22px;
  text-align: center;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.line-total {
  font-size: 15px;
  font-weight: 500;
  text-align: right;
  color: #1d1d1f;
  font-variant-numeric: tabular-nums;
}

.del {
  border: none;
  background: none;
  padding: 0;
  font-size: 12.5px;
  font-family: inherit;
  color: #a1a1a6;
  cursor: pointer;
  transition: color 0.2s;
}

.del:hover {
  color: #ff3b30;
}

.summary {
  position: sticky;
  top: 96px;
  padding: 26px;
  border-radius: 22px;
  background: #f5f5f7;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13.5px;
  color: #6e6e73;
  padding: 6px 0;
}

.free {
  color: #1d1d1f;
}

.row.total {
  margin-top: 10px;
  padding-top: 16px;
  border-top: 0.5px solid rgba(0, 0, 0, 0.1);
  font-size: 15px;
  color: #1d1d1f;
}

.row.total span:last-child {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.8px;
}

.form {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.form label {
  font-size: 12px;
  color: #86868b;
  margin-bottom: 2px;
}

.form input {
  height: 42px;
  padding: 0 14px;
  border: none;
  border-radius: 12px;
  background: #fff;
  color: #1d1d1f;
  font-size: 13.5px;
  font-family: inherit;
  outline: none;
  transition: box-shadow 0.2s;
}

.form input::placeholder {
  color: #b0b0b6;
}

.form input:focus {
  box-shadow: inset 0 0 0 1px #1d1d1f;
}

.submit {
  width: 100%;
  height: 46px;
  margin-top: 20px;
  border: none;
  border-radius: 999px;
  background: #1d1d1f;
  color: #fff;
  font-size: 14px;
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

.tip {
  margin: 12px 0 0;
  font-size: 11.5px;
  line-height: 1.5;
  color: #a1a1a6;
  text-align: center;
}

/* 缩略图配色（与商品卡一致） */
.tone-graphite {
  background: linear-gradient(148deg, #4a4a4d 0%, #1d1d1f 72%);
}
.tone-sand {
  background: linear-gradient(148deg, #f2ebe0 0%, #d8cab6 100%);
}
.tone-violet {
  background: linear-gradient(148deg, #e6e1fc 0%, #b0a8e9 100%);
}
.tone-cream {
  background: linear-gradient(148deg, #fbf6ec 0%, #e7dbc5 100%);
}
.tone-ocean {
  background: linear-gradient(148deg, #e3f0f8 0%, #a6c7db 100%);
}
.tone-stone {
  background: linear-gradient(148deg, #f0edea 0%, #cbc6be 100%);
}
.tone-rose {
  background: linear-gradient(148deg, #fce6eb 0%, #e2aec0 100%);
}
.tone-emerald {
  background: linear-gradient(148deg, #e4f1e9 0%, #a6ccb7 100%);
}

@media (max-width: 900px) {
  .page {
    padding: 40px 20px 32px;
  }
  .layout {
    grid-template-columns: 1fr;
    gap: 32px;
  }
  .summary {
    position: static;
  }
  .head h1 {
    font-size: 30px;
    letter-spacing: -1px;
  }
  .item {
    grid-template-columns: 72px 1fr auto;
    grid-template-areas:
      'thumb detail detail'
      'thumb qty total';
    row-gap: 12px;
  }
  .thumb {
    grid-area: thumb;
    width: 72px;
    height: 72px;
  }
  .detail {
    grid-area: detail;
  }
  .qty {
    grid-area: qty;
  }
  .line-total {
    grid-area: total;
  }
  .del {
    display: none;
  }
}
</style>
