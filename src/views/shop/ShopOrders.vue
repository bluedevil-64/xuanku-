<script setup>
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { shopApi } from '../../api'

const orders = ref([])
const loading = ref(true)
const busy = ref(false)

const STATUS_TEXT = {
  PENDING: '待付款',
  PAID: '已付款',
  SHIPPED: '已发货',
  COMPLETED: '已完成',
  CANCELLED: '已取消',
}

async function load() {
  loading.value = true
  try {
    orders.value = await shopApi.orders()
  } catch {
    orders.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)

function money(v) {
  return Number(v ?? 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

function fmtTime(t) {
  if (!t) return ''
  return String(t).replace('T', ' ').slice(0, 16)
}

async function pay(order) {
  busy.value = true
  try {
    await shopApi.pay(order.id)
    ElMessage.success('付款成功，等待发货')
    await load()
  } finally {
    busy.value = false
  }
}

async function cancel(order) {
  busy.value = true
  try {
    await shopApi.cancel(order.id)
    ElMessage.success('订单已取消')
    await load()
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="page">
    <header class="head">
      <h1>我的订单</h1>
      <p v-if="orders.length">共 {{ orders.length }} 笔</p>
    </header>

    <div v-if="loading" class="skeleton"></div>

    <div v-else-if="!orders.length" class="empty">
      <p>还没有订单</p>
      <router-link to="/shop">去挑点什么 →</router-link>
    </div>

    <ul v-else class="list">
      <li v-for="o in orders" :key="o.id" class="order">
        <div class="top">
          <div class="no">
            订单号 <span>{{ o.orderNo }}</span>
          </div>
          <div class="status" :class="o.status.toLowerCase()">{{ STATUS_TEXT[o.status] || o.status }}</div>
        </div>

        <div class="items">
          <div v-for="it in o.items" :key="it.id" class="item">
            <span class="thumb" :class="`tone-${it.tone}`">
              <img v-if="it.image" :src="it.image" :alt="it.productName" class="thumb-img" />
              <span v-else class="mini"></span>
            </span>
            <div class="detail">
              <div class="nm">{{ it.productName }}</div>
              <div class="qty">数量 × {{ it.quantity }}</div>
            </div>
            <div class="price">¥{{ money(it.price) }}</div>
          </div>
        </div>

        <div class="bottom">
          <div class="meta">
            {{ fmtTime(o.createTime) }} · {{ o.receiverName }} {{ o.receiverPhone }} ·
            {{ o.receiverAddress }}
          </div>
          <div class="right">
            <span class="total">合计 ¥{{ money(o.totalAmount) }}</span>
            <template v-if="o.status === 'PENDING'">
              <button class="ghost" :disabled="busy" @click="cancel(o)">取消订单</button>
              <button class="pay" :disabled="busy" @click="pay(o)">立即付款</button>
            </template>
          </div>
        </div>
      </li>
    </ul>

    <p v-if="orders.length" class="hint">订单进度可以直接问右下角的智能客服，例如「我的订单到哪了」。</p>
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

.list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.order {
  padding: 22px 26px;
  border-radius: 20px;
  background: #f5f5f7;
}

.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.08);
}

.no {
  font-size: 12.5px;
  color: #86868b;
}

.no span {
  color: #1d1d1f;
  font-variant-numeric: tabular-nums;
}

.status {
  font-size: 12px;
  font-weight: 500;
  padding: 4px 11px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.06);
  color: #1d1d1f;
}

.status.pending {
  background: rgba(255, 149, 0, 0.14);
  color: #9a5b00;
}

.status.cancelled,
.status.completed {
  color: #86868b;
}

.items {
  padding: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.item {
  display: flex;
  align-items: center;
  gap: 14px;
}

.thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 12px;
  flex: none;
  overflow: hidden;
}

.mini {
  display: block;
  width: 40%;
  aspect-ratio: 1;
  border-radius: 50%;
  background-image: linear-gradient(155deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.3));
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detail {
  flex: 1;
  min-width: 0;
}

.nm {
  font-size: 14px;
  color: #1d1d1f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qty {
  margin-top: 3px;
  font-size: 12px;
  color: #86868b;
}

.price {
  font-size: 13.5px;
  color: #6e6e73;
  font-variant-numeric: tabular-nums;
}

.bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding-top: 16px;
  border-top: 0.5px solid rgba(0, 0, 0, 0.08);
}

.meta {
  font-size: 12px;
  color: #a1a1a6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.right {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: none;
}

.total {
  font-size: 14px;
  font-weight: 500;
  color: #1d1d1f;
  font-variant-numeric: tabular-nums;
}

.ghost,
.pay {
  height: 34px;
  padding: 0 16px;
  border-radius: 999px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.2s, opacity 0.2s;
}

.ghost {
  border: 0.5px solid rgba(0, 0, 0, 0.14);
  background: transparent;
  color: #1d1d1f;
}

.ghost:hover {
  border-color: rgba(0, 0, 0, 0.4);
}

.pay {
  border: none;
  background: #1d1d1f;
  color: #fff;
}

.pay:hover {
  background: #000;
}

.ghost:disabled,
.pay:disabled {
  opacity: 0.4;
  cursor: default;
}

.hint {
  margin: 24px 0 0;
  font-size: 12px;
  color: #a1a1a6;
}

.skeleton {
  height: 220px;
  border-radius: 20px;
  background: linear-gradient(90deg, #f5f5f7 25%, #eeeef1 37%, #f5f5f7 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
}

@keyframes shimmer {
  from {
    background-position: 100% 50%;
  }
  to {
    background-position: 0 50%;
  }
}

/* 缩略图配色 */
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
  .head h1 {
    font-size: 30px;
    letter-spacing: -1px;
  }
  .order {
    padding: 18px 18px;
  }
  .bottom {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  .meta {
    width: 100%;
  }
}
</style>
