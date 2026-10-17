<script setup>
import { onMounted, ref } from 'vue'
import { statsApi } from '../api'

const overview = ref(null)
const loading = ref(true)

function money(v) {
  return Number(v ?? 0).toLocaleString('zh-CN', { maximumFractionDigits: 0 })
}

onMounted(async () => {
  try {
    overview.value = await statsApi.overview()
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-loading="loading" class="stats-page">
    <div class="page-head">
      <h1 class="page-title">统计看板</h1>
      <p class="page-sub">生意、工单与知识运营的整体表现</p>
    </div>
    <template v-if="overview">
      <h3 class="section-title">生意概况</h3>
      <div class="card-grid">
        <div class="stat-card">
          <div class="stat-value">¥{{ money(overview.gmv) }}</div>
          <div class="stat-label">累计成交额（不含已取消）</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ overview.orderCount }}</div>
          <div class="stat-label">订单数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">¥{{ money(overview.avgOrderAmount) }}</div>
          <div class="stat-label">客单价</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ overview.customerCount }}</div>
          <div class="stat-label">注册客户</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ overview.onSaleProducts }}</div>
          <div class="stat-label">在售商品</div>
        </div>
      </div>

      <div v-if="overview.topProducts?.length" class="top-products">
        <span class="top-label">咨询最多</span>
        <span v-for="(p, i) in overview.topProducts" :key="p.name" class="top-item">
          <em>{{ i + 1 }}</em>{{ p.name }}<i>{{ p.consultCount }}</i>
        </span>
      </div>

      <h3 class="section-title">会话与消息</h3>
      <div class="card-grid">
        <div class="stat-card">
          <div class="stat-value">{{ overview.conversationCount }}</div>
          <div class="stat-label">会话总量</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ overview.todayConversations }}</div>
          <div class="stat-label">今日新增会话</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ overview.messageCount }}</div>
          <div class="stat-label">消息总量</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ overview.avgRating ?? '—' }}</div>
          <div class="stat-label">平均评分（{{ overview.ratingCount }} 人评价）</div>
        </div>
      </div>

      <h3 class="section-title">工单概览</h3>
      <div class="card-grid">
        <div class="stat-card">
          <div class="stat-value">{{ overview.ticketTotal }}</div>
          <div class="stat-label">工单总数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value warn">{{ overview.ticketPending }}</div>
          <div class="stat-label">待处理</div>
        </div>
        <div class="stat-card">
          <div class="stat-value warn">{{ overview.ticketProcessing }}</div>
          <div class="stat-label">处理中</div>
        </div>
        <div class="stat-card">
          <div class="stat-value ok">{{ overview.resolveRate }}%</div>
          <div class="stat-label">解决率（已解决+已关闭）</div>
        </div>
        <div class="stat-card">
          <div class="stat-value ok">{{ overview.aiResolveRate }}%</div>
          <div class="stat-label">AI 自主解决率（未升级工单）</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ overview.avgTicketHours ?? '—' }}</div>
          <div class="stat-label">工单平均处理时长（小时）</div>
        </div>
      </div>

      <h3 class="section-title">知识运营</h3>
      <div class="card-grid">
        <div class="stat-card">
          <div class="stat-value warn">{{ overview.pendingQuestions }}</div>
          <div class="stat-label">待补充的未答问题</div>
        </div>
        <div class="stat-card">
          <div class="stat-value ok">{{ overview.ticketResolved }}</div>
          <div class="stat-label">已解决工单</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ overview.ticketClosed }}</div>
          <div class="stat-label">已关闭工单</div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.stats-page {
  max-width: 1000px;
  margin: 0 auto;
  padding-bottom: 12px;
}

/* iOS 大标题 */
.top-products {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 14px 2px 4px;
}

.top-label {
  font-size: 12px;
  color: var(--text-3);
}

.top-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  background: var(--fill-1);
  font-size: 12px;
  color: var(--text-2);
}

.top-item em {
  font-style: normal;
  font-size: 10.5px;
  color: var(--text-3);
}

.top-item i {
  font-style: normal;
  font-variant-numeric: tabular-nums;
  color: var(--text-1);
}

.page-head {
  padding: 4px 4px 12px;
}

.page-title {
  margin: 0;
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.9px;
  color: var(--text-1);
}

.page-sub {
  margin: 6px 0 0;
  font-size: 14px;
  color: var(--text-2);
}

.section-title {
  margin: 10px 0 10px 4px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.3px;
  color: var(--text-2);
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 22px;
}

.stat-card {
  position: relative;
  overflow: hidden;
  padding: 18px 20px 16px;
  border-radius: 18px;
  border: 1px solid var(--border-1);
  background: #fff;
  box-shadow: none;
  transition: transform 0.26s var(--ease-ios), box-shadow 0.26s var(--ease-ios);
}

/* 悬停时轻微抬升，保持留白与克制 */
.stat-card:hover {
  border-color: rgba(0, 0, 0, 0.16);
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-float);
}

.stat-value {
  font-size: 32px;
  font-weight: 650;
  line-height: 1.15;
  letter-spacing: -1.2px;
  color: var(--text-1);
  font-variant-numeric: tabular-nums;
}

.stat-value.warn {
  color: var(--warn);
}

.stat-value.ok {
  color: var(--ok);
}

.stat-label {
  margin-top: 7px;
  font-size: 13px;
  color: var(--text-2);
}

@media (max-width: 900px) {
  .card-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .page-title {
    font-size: 26px;
  }
}
</style>
