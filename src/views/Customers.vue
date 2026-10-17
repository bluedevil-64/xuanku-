<script setup>
import { onMounted, ref } from 'vue'
import { adminApi } from '../api'

const list = ref([])
const keyword = ref('')
const loading = ref(false)

const drawer = ref(false)
const detail = ref(null)
const detailLoading = ref(false)

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
    list.value = await adminApi.customers({ keyword: keyword.value || undefined })
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function openDetail(row) {
  drawer.value = true
  detailLoading.value = true
  try {
    detail.value = await adminApi.customer(row.id)
  } finally {
    detailLoading.value = false
  }
}

function money(v) {
  return Number(v ?? 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

function day(t) {
  return t ? String(t).replace('T', ' ').slice(0, 10) : '—'
}
</script>

<template>
  <div class="page">
    <header class="head">
      <h1>客户</h1>
      <p>消费与咨询档案，点开可看待处理订单与咨询记录</p>
    </header>

    <div class="toolbar">
      <el-input
        v-model="keyword"
        placeholder="搜索昵称或用户名"
        clearable
        style="width: 260px"
        @keyup.enter="load"
        @clear="load"
      />
      <el-button @click="load">查询</el-button>
      <span class="spacer"></span>
      <span class="count">共 {{ list.length }} 位</span>
    </div>

    <el-table :data="list" v-loading="loading">
      <el-table-column label="客户" min-width="200">
        <template #default="{ row }">
          <div class="who">
            <span class="avatar">{{ (row.nickname || row.username || 'U').slice(0, 1) }}</span>
            <div>
              <div class="name">{{ row.nickname || row.username }}</div>
              <div class="sub">@{{ row.username }}</div>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="注册于" width="120">
        <template #default="{ row }">{{ day(row.createTime) }}</template>
      </el-table-column>
      <el-table-column prop="orderCount" label="订单" width="80" />
      <el-table-column label="累计消费" width="130">
        <template #default="{ row }">¥{{ money(row.totalSpent) }}</template>
      </el-table-column>
      <el-table-column prop="conversationCount" label="咨询" width="80" />
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row)">查看</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-drawer v-model="drawer" title="客户档案" size="480px">
      <div v-loading="detailLoading">
        <template v-if="detail">
          <div class="profile">
            <span class="avatar big">{{ (detail.customer.nickname || 'U').slice(0, 1) }}</span>
            <div>
              <div class="name">{{ detail.customer.nickname }}</div>
              <div class="sub">
                @{{ detail.customer.username }} · 注册于 {{ day(detail.customer.createTime) }}
              </div>
            </div>
          </div>

          <div class="metrics">
            <div><span>{{ detail.customer.orderCount }}</span><em>订单</em></div>
            <div><span>¥{{ money(detail.customer.totalSpent) }}</span><em>消费</em></div>
            <div><span>{{ detail.customer.conversationCount }}</span><em>咨询</em></div>
          </div>

          <h3>最近订单</h3>
          <div v-if="!detail.orders.length" class="empty">暂无订单</div>
          <div v-for="o in detail.orders" :key="o.id" class="row-item">
            <div>
              <div class="row-title">{{ o.orderNo }}</div>
              <div class="row-sub">{{ day(o.createTime) }}</div>
            </div>
            <div class="row-right">
              <span class="amount">¥{{ money(o.totalAmount) }}</span>
              <span class="status">{{ STATUS_TEXT[o.status] || o.status }}</span>
            </div>
          </div>

          <h3>最近咨询</h3>
          <div v-if="!detail.conversations.length" class="empty">暂无咨询</div>
          <div v-for="c in detail.conversations" :key="c.id" class="row-item">
            <div>
              <div class="row-title">{{ c.title }}</div>
              <div class="row-sub">{{ day(c.updateTime) }}</div>
            </div>
            <span v-if="c.productId" class="status">商品咨询</span>
          </div>
        </template>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.page {
  max-width: 1240px;
  margin: 0 auto;
}

.head {
  margin-bottom: 22px;
}

.head h1 {
  margin: 0;
  font-size: 30px;
  font-weight: 600;
  letter-spacing: -1px;
  color: var(--text-1);
}

.head p {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--text-3);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.spacer {
  flex: 1;
}

.count {
  font-size: 12.5px;
  color: var(--text-3);
}

.who {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--text-1);
  color: #fff;
  font-size: 12px;
  flex: none;
}

.avatar.big {
  width: 52px;
  height: 52px;
  font-size: 20px;
}

.name {
  font-size: 13.5px;
  color: var(--text-1);
}

.sub {
  margin-top: 3px;
  font-size: 11.5px;
  color: var(--text-3);
}

.profile {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-1);
}

.metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin: 18px 0 8px;
}

.metrics div {
  padding: 14px;
  border-radius: 12px;
  background: var(--fill-1);
  text-align: center;
}

.metrics span {
  display: block;
  font-size: 17px;
  font-weight: 500;
  color: var(--text-1);
  font-variant-numeric: tabular-nums;
}

.metrics em {
  display: block;
  margin-top: 4px;
  font-style: normal;
  font-size: 11.5px;
  color: var(--text-3);
}

h3 {
  margin: 22px 0 10px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.1em;
  color: var(--text-3);
}

.row-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 0;
  border-bottom: 1px solid var(--border-1);
}

.row-title {
  font-size: 13px;
  color: var(--text-1);
  font-variant-numeric: tabular-nums;
}

.row-sub {
  margin-top: 3px;
  font-size: 11.5px;
  color: var(--text-3);
}

.row-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.amount {
  font-size: 13px;
  color: var(--text-1);
}

.status {
  font-size: 11.5px;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--fill-1);
  color: var(--text-2);
  white-space: nowrap;
}

.empty {
  padding: 18px 0;
  font-size: 12.5px;
  color: var(--text-3);
}
</style>
