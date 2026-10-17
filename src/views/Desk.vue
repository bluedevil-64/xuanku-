<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
import { deskApi, ticketApi } from '../api'
import { useUserStore } from '../stores/user'

const store = useUserStore()
const activeTab = ref('tickets')

/* ================= 工单管理 ================= */
const STATUS_LABEL = { PENDING: '待处理', PROCESSING: '处理中', RESOLVED: '已解决', CLOSED: '已关闭' }
const TICKET_TYPE = {
  REFUND: '退款', RETURN: '退货', LOGISTICS: '物流', QUALITY: '质量', OTHER: '其他',
}
const STATUS_TYPE = { PENDING: 'warning', PROCESSING: 'primary', RESOLVED: 'success', CLOSED: 'info' }

const tickets = ref([])
const ticketStatus = ref('')
const ticketTotal = ref(0)
const ticketPage = ref(1)
const ticketSize = ref(20)
const ticketsLoading = ref(false)
const detailVisible = ref(false)
const detail = ref(null)
const detailLogs = ref([])
const resolveVisible = ref(false)
const resolveRemark = ref('')
const resolveTicketId = ref(null)
const closeTicketId = ref(null)

async function loadTickets() {
  ticketsLoading.value = true
  try {
    const res = await ticketApi.list({
      scope: 'all',
      status: ticketStatus.value || undefined,
      page: ticketPage.value,
      size: ticketSize.value,
    })
    tickets.value = res.records || []
    ticketTotal.value = Number(res.total) || 0
  } finally {
    ticketsLoading.value = false
  }
}

function onTicketStatusChange() {
  ticketPage.value = 1
  loadTickets()
}

function onTicketSizeChange() {
  ticketPage.value = 1
  loadTickets()
}

async function openDetail(row) {
  detail.value = row
  detailLogs.value = (await ticketApi.detail(row.id)).logs || []
  detailVisible.value = true
}

async function acceptTicket(row) {
  await ticketApi.accept(row.id)
  ElMessage.success('已接手')
  loadTickets()
}

function showResolve(row) {
  resolveTicketId.value = row.id
  resolveRemark.value = ''
  resolveVisible.value = true
}

async function doResolve() {
  await ticketApi.resolve(resolveTicketId.value, resolveRemark.value)
  resolveVisible.value = false
  ElMessage.success('已标记解决')
  loadTickets()
}

async function closeTicket(row) {
  await ticketApi.close(row.id, '')
  ElMessage.success('已关闭')
  loadTickets()
}

async function reopenTicket(row) {
  await ticketApi.reopen(row.id, '')
  ElMessage.success('已重开')
  loadTickets()
}

/* ================= 会话记录 ================= */
const convs = ref([])
const convTotal = ref(0)
const convPage = ref(1)
const convSize = ref(50)
const currentConvId = ref(null)
const convMessages = ref([])
const convBodyRef = ref(null)

/* ---- 会话筛选：类型 + 关键词 ---- */
function convTitle(c) {
  return (c.title || '').replace(/^商品咨询：/, '')
}

const convKeyword = ref('')
const convType = ref('all')

const filteredConvs = computed(() => {
  const kw = convKeyword.value.trim().toLowerCase()
  return convs.value.filter((c) => {
    if (convType.value === 'product' && !c.productId) return false
    if (convType.value === 'service' && c.productId) return false
    if (!kw) return true
    return (
      (c.title || '').toLowerCase().includes(kw) ||
      (c.nickname || '').toLowerCase().includes(kw) ||
      (c.productName || '').toLowerCase().includes(kw) ||
      (c.orderNo || '').toLowerCase().includes(kw)
    )
  })
})

/* ---- 会话业务上下文 ---- */
const convContext = ref(null)

async function loadContext(id) {
  convContext.value = null
  try {
    convContext.value = await deskApi.convContext(id)
  } catch {
    convContext.value = null
  }
}

/* ---- 从会话一键建单 ---- */
const ticketDlg = ref(false)
const ticketForm = ref({ type: 'LOGISTICS', title: '', description: '' })

function openCreateTicket() {
  const c = convs.value.find((x) => x.id === currentConvId.value)
  if (!c) return
  ticketForm.value = {
    type: 'LOGISTICS',
    title: c.productName ? `${c.productName} · 售后咨询` : c.title || '客户咨询',
    description: c.orderNo ? `关联订单 ${c.orderNo}` : '',
  }
  ticketDlg.value = true
}

async function submitTicket() {
  const c = convs.value.find((x) => x.id === currentConvId.value)
  if (!c) return
  if (!ticketForm.value.title.trim()) {
    ElMessage.warning('请填写工单标题')
    return
  }
  await ticketApi.create({
    title: ticketForm.value.title.trim(),
    description: ticketForm.value.description.trim(),
    type: ticketForm.value.type,
    conversationId: c.id,
    productId: c.productId || null,
    orderId: c.orderId || null,
  })
  ticketDlg.value = false
  ElMessage.success('工单已创建，可到「工单管理」跟进')
  loadTickets()
}

async function loadConvs() {
  const res = await deskApi.conversations({
    page: convPage.value,
    size: convSize.value,
  })
  convs.value = res.records || []
  convTotal.value = Number(res.total) || 0
}

async function selectConv(id) {
  loadContext(id)
  currentConvId.value = id
  convMessages.value = await deskApi.convMessages(id)
  nextTick(() => {
    const el = convBodyRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

/* ================= 未答问题（自我学习） ================= */
const PQ_STATUS = { PENDING: '待补充', RESOLVED: '已生效' }
const PQ_TYPE = { PENDING: 'warning', RESOLVED: 'success' }

const questions = ref([])
const questionStatus = ref('PENDING')
const questionsLoading = ref(false)
const pqDialogVisible = ref(false)
const pqCurrent = ref(null)
const pqAnswer = ref('')

async function loadQuestions() {
  questionsLoading.value = true
  try {
    questions.value = await deskApi.questions(questionStatus.value)
  } finally {
    questionsLoading.value = false
  }
}

function showResolveQ(row) {
  pqCurrent.value = row
  pqAnswer.value = ''
  pqDialogVisible.value = true
}

async function doResolveQ() {
  if (!pqAnswer.value.trim()) {
    ElMessage.warning('请输入答案')
    return
  }
  await deskApi.resolveQuestion(pqCurrent.value.id, pqAnswer.value)
  pqDialogVisible.value = false
  ElMessage.success('已生成 FAQ，知识重新生效')
  loadQuestions()
}

/* ================= 转人工 ================= */
const pendingList = ref([])
const ws = ref(null)
const wsReady = ref(false)
const servingUserId = ref(null)
const servingNickname = ref('')
const servingMessages = ref([])
const servingInput = ref('')
const servingBodyRef = ref(null)
let pollTimer = null
let knownPendingIds = new Set() // 已知排队用户，用于 diff 出新排队并提醒

async function loadPending() {
  if (!wsReady.value) return
  const list = await deskApi.handoffs()
  // 发现新排队用户：右上角弹窗提醒（首次加载不提醒）
  if (knownPendingIds.size > 0) {
    list
      .filter((p) => !knownPendingIds.has(p.userId))
      .forEach((p) => {
        ElNotification({
          title: '新的排队用户',
          message: `${p.nickname} 正在等待人工客服接入`,
          type: 'warning',
          duration: 8000,
        })
      })
  }
  knownPendingIds = new Set(list.map((p) => p.userId))
  pendingList.value = list
}

async function acceptHandoff(row) {
  const brief = await deskApi.acceptHandoff(row.userId)
  servingUserId.value = brief.userId
  servingNickname.value = brief.nickname
  servingMessages.value = []
  ElMessage.success(`已接入 ${brief.nickname}`)
  pendingList.value = pendingList.value.filter((p) => p.userId !== row.userId)
}

function scrollServing() {
  nextTick(() => {
    const el = servingBodyRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

function connectWs() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  ws.value = new WebSocket(`${proto}://${location.host}/api/ws/chat?token=${store.token}`)
  ws.value.onopen = () => {
    wsReady.value = true
    loadPending()
  }
  ws.value.onmessage = (e) => {
    const data = JSON.parse(e.data)
    if (data.type === 'MSG' && data.userId === servingUserId.value) {
      servingMessages.value.push({ role: 'user', nickname: data.nickname, content: data.content })
      scrollServing()
    } else if (data.type === 'ENDED') {
      if (data.userId && data.userId !== servingUserId.value) return
      if (servingUserId.value) {
        servingMessages.value.push({ role: 'system', content: '会话已结束' })
        servingUserId.value = null
        servingNickname.value = ''
      }
      loadPending()
    }
  }
  ws.value.onclose = () => {
    wsReady.value = false
  }
}

function sendServing() {
  const text = servingInput.value.trim()
  if (!text || !ws.value || ws.value.readyState !== WebSocket.OPEN) return
  if (!servingUserId.value) {
    ElMessage.info('请先在队列中接入用户')
    return
  }
  ws.value.send(JSON.stringify({ type: 'MSG', userId: servingUserId.value, content: text }))
  servingMessages.value.push({ role: 'agent', content: text })
  servingInput.value = ''
  scrollServing()
}

function endServing() {
  if (!servingUserId.value) return
  ws.value.send(JSON.stringify({ type: 'END' }))
  servingMessages.value.push({ role: 'system', content: '已结束本次服务' })
  servingUserId.value = null
  servingNickname.value = ''
}

function enterHandoffTab() {
  if (!ws.value) connectWs()
  pollTimer = setInterval(loadPending, 5000)
}

function leaveTab() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onMounted(() => {
  loadTickets()
  loadConvs()
})

onBeforeUnmount(() => {
  leaveTab()
  if (ws.value) ws.value.close()
})
</script>

<template>
  <el-tabs v-model="activeTab" class="desk-tabs" @tab-change="(name) => (name === 'handoff' ? enterHandoffTab() : leaveTab())">
    <!-- 工单管理 -->
    <el-tab-pane label="工单管理" name="tickets">
      <div class="toolbar">
        <el-radio-group v-model="ticketStatus" @change="onTicketStatusChange">
          <el-radio-button value="">全部</el-radio-button>
          <el-radio-button v-for="(label, key) in STATUS_LABEL" :key="key" :value="key">
            {{ label }}
          </el-radio-button>
        </el-radio-group>
        <el-button @click="loadTickets">刷新</el-button>
      </div>
      <el-table :data="tickets" v-loading="ticketsLoading" border>
        <el-table-column prop="id" label="工单号" width="190" />
        <el-table-column prop="title" label="标题" min-width="160" show-overflow-tooltip />
        <el-table-column label="类型" width="88">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ TICKET_TYPE[row.type] || '其他' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="userId" label="用户ID" width="190" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="STATUS_TYPE[row.status]">{{ STATUS_LABEL[row.status] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updateTime" label="更新时间" width="170" />
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
            <el-button v-if="row.status === 'PENDING'" link type="success" @click="acceptTicket(row)">接手</el-button>
            <el-button v-if="row.status === 'PROCESSING'" link type="success" @click="showResolve(row)">解决</el-button>
            <el-button v-if="row.status === 'PENDING' || row.status === 'RESOLVED'" link type="danger" @click="closeTicket(row)">
              {{ row.status === 'PENDING' ? '撤销' : '关闭' }}
            </el-button>
            <el-button v-if="row.status === 'RESOLVED'" link type="warning" @click="reopenTicket(row)">重开</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="ticketPage"
        v-model:page-size="ticketSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="ticketTotal"
        layout="total, sizes, prev, pager, next"
        class="pager"
        @current-change="loadTickets"
        @size-change="onTicketSizeChange"
      />

      <el-drawer v-model="detailVisible" :title="detail?.title" size="420px">
        <template v-if="detail">
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="工单号">{{ detail.id }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="STATUS_TYPE[detail.status]">{{ STATUS_LABEL[detail.status] }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="问题描述">{{ detail.description }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ detail.createTime }}</el-descriptions-item>
          </el-descriptions>
          <h4 class="log-title">流转日志</h4>
          <el-timeline>
            <el-timeline-item v-for="log in detailLogs" :key="log.id" :timestamp="log.createTime">
              <b>{{ log.operatorName }}</b> {{ log.action }}
              <span v-if="log.fromStatus">（{{ STATUS_LABEL[log.fromStatus] }} → {{ STATUS_LABEL[log.toStatus] }}）</span>
              <div v-if="log.remark" class="log-remark">{{ log.remark }}</div>
            </el-timeline-item>
          </el-timeline>
        </template>
      </el-drawer>

      <el-dialog v-model="resolveVisible" title="标记解决" width="420px">
        <el-input v-model="resolveRemark" type="textarea" :rows="3" placeholder="处理结果说明（可选）" />
        <template #footer>
          <el-button @click="resolveVisible = false">取消</el-button>
          <el-button type="primary" @click="doResolve">确认解决</el-button>
        </template>
      </el-dialog>
    </el-tab-pane>

    <!-- 会话记录 -->
    <el-tab-pane label="会话记录" name="conversations">
      <div class="conv-layout">
        <div class="conv-list">
          <el-input
            v-model="convKeyword"
            placeholder="搜索客户 / 商品 / 订单号"
            size="small"
            clearable
            class="conv-search"
          />
          <el-radio-group v-model="convType" size="small" class="conv-filter">
            <el-radio-button value="all">全部</el-radio-button>
            <el-radio-button value="product">商品咨询</el-radio-button>
            <el-radio-button value="service">客服</el-radio-button>
          </el-radio-group>
          <div
            v-for="c in filteredConvs"
            :key="c.id"
            class="conv-item"
            :class="{ active: c.id === currentConvId }"
            @click="selectConv(c.id)"
          >
            <img v-if="c.productImage" :src="c.productImage" class="conv-thumb" alt="" />
            <div class="conv-info">
              <div class="conv-title">{{ convTitle(c) }}</div>
              <div class="conv-meta">
                <span>{{ c.nickname }}</span>
                <span v-if="c.orderNo" class="conv-chip">{{ c.orderNo }}</span>
              </div>
            </div>
            <span v-if="c.waitMinutes >= 30" class="conv-wait">{{ c.waitMinutes }}′</span>
          </div>
          <el-empty v-if="filteredConvs.length === 0" description="没有匹配的会话" :image-size="60" />
          <el-pagination
            v-model:current-page="convPage"
            :page-size="convSize"
            :total="convTotal"
            small
            layout="prev, pager, next"
            class="conv-pager"
            @current-change="loadConvs"
          />
        </div>

        <div class="conv-main">
          <div v-if="convContext" class="ctx">
            <div class="ctx-head">
              <span>业务上下文</span>
              <el-button size="small" type="primary" @click="openCreateTicket">生成工单</el-button>
            </div>
            <div class="ctx-row">
              <div v-if="convContext.product" class="ctx-product">
                <img v-if="convContext.product.image" :src="convContext.product.image" alt="" />
                <div>
                  <div class="ctx-name">{{ convContext.product.name }}</div>
                  <div class="ctx-sub">
                    ¥{{ convContext.product.price }} · 库存 {{ convContext.product.stock }} ·
                    {{ TICKET_TYPE[convContext.product.category] || convContext.product.category }}
                  </div>
                </div>
              </div>
              <div v-else class="ctx-sub">本次会话无关联商品</div>

              <div v-if="convContext.recentOrders?.length" class="ctx-orders">
                <span class="ctx-label">最近订单</span>
                <span v-for="o in convContext.recentOrders" :key="o.id" class="ctx-chip">
                  {{ o.orderNo }} · ¥{{ o.totalAmount }}
                </span>
              </div>
            </div>
          </div>

          <div ref="convBodyRef" class="conv-body">
            <el-empty v-if="!currentConvId" description="选择左侧会话查看记录" />
            <template v-else>
              <div v-for="m in convMessages" :key="m.id" class="msg-row" :class="m.role">
                <div class="avatar">{{ m.role === 'user' ? '我' : m.role === 'agent' ? '客服' : 'AI' }}</div>
                <div class="bubble">{{ m.content }}</div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <el-dialog v-model="ticketDlg" title="从会话生成工单" width="460px">
        <el-form label-width="72px">
          <el-form-item label="类型">
            <el-select v-model="ticketForm.type" style="width: 100%">
              <el-option v-for="(label, key) in TICKET_TYPE" :key="key" :label="label" :value="key" />
            </el-select>
          </el-form-item>
          <el-form-item label="标题">
            <el-input v-model="ticketForm.title" maxlength="80" />
          </el-form-item>
          <el-form-item label="描述">
            <el-input v-model="ticketForm.description" type="textarea" :rows="3" />
          </el-form-item>
        </el-form>
        <template #footer>
          <el-button @click="ticketDlg = false">取消</el-button>
          <el-button type="primary" @click="submitTicket">创建工单</el-button>
        </template>
      </el-dialog>
    </el-tab-pane>

    <!-- 未答问题（自我学习） -->
    <el-tab-pane label="未答问题" name="questions">
      <div class="toolbar">
        <el-radio-group v-model="questionStatus" @change="loadQuestions">
          <el-radio-button value="PENDING">待补充</el-radio-button>
          <el-radio-button value="RESOLVED">已生效</el-radio-button>
          <el-radio-button value="">全部</el-radio-button>
        </el-radio-group>
        <el-button @click="loadQuestions">刷新</el-button>
      </div>
      <el-table :data="questions" v-loading="questionsLoading" border>
        <el-table-column prop="question" label="问题" min-width="240" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="PQ_TYPE[row.status]">{{ PQ_STATUS[row.status] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="提问时间" width="170" />
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'PENDING'" link type="primary" @click="showResolveQ(row)">
              补充答案
            </el-button>
            <span v-else class="resolved-faq">FAQ #{{ row.faqId }}</span>
          </template>
        </el-table-column>
      </el-table>

      <el-dialog v-model="pqDialogVisible" :title="`补充答案：${pqCurrent?.question || ''}`" width="520px">
        <div class="pq-tip">提交后将自动生成 FAQ 并重建向量，该问题在知识库中重新生效。</div>
        <el-input v-model="pqAnswer" type="textarea" :rows="5" placeholder="输入该问题的标准答案" />
        <template #footer>
          <el-button @click="pqDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="doResolveQ">提交并生成 FAQ</el-button>
        </template>
      </el-dialog>
    </el-tab-pane>

    <!-- 转人工 -->
    <el-tab-pane label="转人工" name="handoff">
      <div class="handoff-layout">
        <div class="queue-panel">
          <h4>排队中（{{ pendingList.length }}）</h4>
          <div v-for="p in pendingList" :key="p.userId" class="queue-item">
            <div>
              <div class="queue-name">{{ p.nickname }}</div>
              <div class="queue-time">{{ p.queuedAt }}</div>
            </div>
            <el-button type="primary" size="small" @click="acceptHandoff(p)">接入</el-button>
          </div>
          <el-empty v-if="pendingList.length === 0 && wsReady" description="暂无排队用户" :image-size="60" />
          <el-alert v-if="!wsReady" title="WebSocket 未连接，请检查后端服务" type="error" :closable="false" />
        </div>
        <div class="serving-panel">
          <template v-if="servingUserId">
            <div class="serving-header">
              <span>正在服务：{{ servingNickname }}</span>
              <el-button size="small" type="danger" plain @click="endServing">结束服务</el-button>
            </div>
            <div ref="servingBodyRef" class="serving-body">
              <div v-for="(m, i) in servingMessages" :key="i" class="msg-row" :class="m.role">
                <div class="avatar">{{ m.role === 'agent' ? '我' : '用户' }}</div>
                <div class="bubble">{{ m.content }}</div>
              </div>
            </div>
            <div class="serving-input">
              <el-input v-model="servingInput" placeholder="输入回复，Enter 发送" @keydown.enter="sendServing" />
              <el-button type="primary" :disabled="!servingInput.trim()" @click="sendServing">发送</el-button>
            </div>
          </template>
          <el-empty v-else description="从左侧队列接入用户开始服务" />
        </div>
      </div>
    </el-tab-pane>
  </el-tabs>
</template>

<style scoped>
.desk-tabs {
  padding: 16px 20px;
  height: 100%;
  overflow-y: auto;
  border-radius: var(--radius-card);
  border: 1px solid var(--border-1);
  background: #fff;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.log-title {
  margin: 16px 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

.log-remark {
  color: var(--text-2);
  font-size: 13px;
  margin-top: 2px;
}

.conv-layout,
.handoff-layout {
  display: flex;
  gap: 14px;
  height: calc(100vh - 236px);
  min-height: 360px;
}

/* ===== 会话列表 ===== */
.conv-search {
  margin-bottom: 8px;
}

.conv-filter {
  margin-bottom: 10px;
  width: 100%;
}

.conv-filter :deep(.el-radio-button) {
  flex: 1;
}

.conv-filter :deep(.el-radio-button__inner) {
  width: 100%;
  padding: 5px 0;
  font-size: 12px;
}

.conv-list {
  width: 276px;
  flex-shrink: 0;
  overflow-y: auto;
  border-right: 1px solid var(--border-1);
  padding-right: 10px;
}

.conv-item {
  padding: 10px 12px;
  border-radius: 12px;
  cursor: pointer;
  margin-bottom: 2px;
  transition: background-color 0.2s var(--ease-ios), transform 0.2s var(--ease-ios);
}

.conv-item:hover {
  background: var(--fill-2);
}

.conv-item:active {
  transform: scale(0.985);
}

.conv-item.active {
  background: var(--brand-soft);
}

.conv-item.active .conv-title {
  color: var(--brand);
  font-weight: 590;
}

.pager {
  margin-top: 12px;
  justify-content: flex-end;
}

.conv-pager {
  margin-top: 10px;
}

.conv-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conv-meta {
  font-size: 12px;
  color: var(--text-3);
  margin-top: 3px;
}

/* ===== 消息区 ===== */
.conv-main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.conv-thumb {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  object-fit: cover;
  flex: none;
}

.conv-info {
  flex: 1;
  min-width: 0;
}

.conv-chip {
  margin-left: 8px;
  font-variant-numeric: tabular-nums;
  opacity: 0.75;
}

.conv-wait {
  flex: none;
  font-size: 11px;
  color: var(--warn);
  font-variant-numeric: tabular-nums;
}

.ctx {
  flex: none;
  border: 1px solid var(--border-1);
  border-radius: 14px;
  padding: 14px 16px;
  background: #fff;
}

.ctx-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 12px;
  letter-spacing: 0.1em;
  color: var(--text-3);
}

.ctx-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}

.ctx-product {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ctx-product img {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  object-fit: cover;
}

.ctx-name {
  font-size: 13px;
  color: var(--text-1);
}

.ctx-sub {
  margin-top: 3px;
  font-size: 12px;
  color: var(--text-3);
}

.ctx-orders {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.ctx-label {
  font-size: 12px;
  color: var(--text-3);
}

.ctx-chip {
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--fill-1);
  font-size: 11.5px;
  color: var(--text-2);
  font-variant-numeric: tabular-nums;
}

.conv-body,
.serving-body {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: 16px;
  background: var(--fill-1);
  border-radius: 16px;
}

.msg-row {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  margin-bottom: 12px;
  animation: msg-in 0.3s var(--ease-ios) both;
}

@keyframes msg-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* 客服自己发的消息在右侧，对方在左侧 */
.msg-row.agent {
  flex-direction: row-reverse;
}

.avatar {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10.5px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(180deg, #8e8e93 0%, #636366 100%);
  box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.35);
}

.msg-row.user .avatar {
  background: linear-gradient(180deg, #4a4a4c 0%, #1d1d1f 100%);
}

.msg-row.agent .avatar {
  background: linear-gradient(180deg, #5ee27a 0%, #34c759 100%);
}

.bubble {
  max-width: 68%;
  padding: 9px 14px;
  border-radius: var(--radius-bubble);
  background: #fff;
  color: var(--text-1);
  font-size: 14px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.msg-row.user .bubble {
  border-bottom-left-radius: 6px;
}

.msg-row.agent .bubble {
  background: var(--brand-gradient);
  color: #fff;
  border-bottom-right-radius: 6px;
  box-shadow: none;
}

.msg-row.system {
  justify-content: center;
}

.msg-row.system .avatar {
  display: none;
}

.msg-row.system .bubble {
  background: var(--fill-1);
  color: var(--text-2);
  font-size: 12px;
  padding: 5px 13px;
  border-radius: 999px;
  box-shadow: none;
}

/* ===== 转人工 ===== */
.queue-panel {
  width: 276px;
  flex-shrink: 0;
  border-right: 1px solid var(--border-1);
  padding-right: 12px;
  overflow-y: auto;
}

.queue-panel h4 {
  margin: 4px 0 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

.queue-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 11px 13px;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 0 0 1px var(--border-1);
  margin-bottom: 8px;
  transition: box-shadow 0.2s, transform 0.24s var(--ease-ios);
}

.queue-item:hover {
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.28);
  transform: translateY(-1px);
}

.queue-name {
  font-size: 14px;
  font-weight: 500;
}

.queue-time {
  font-size: 12px;
  color: var(--text-3);
  margin-top: 2px;
}

.serving-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 0 0 1px var(--border-1);
}

.serving-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 11px 16px;
  border-bottom: 1px solid var(--border-1);
  background: #fff;
  font-size: 14px;
  font-weight: 550;
}

.serving-panel .serving-body {
  border-radius: 0;
  background: var(--fill-1);
}

.serving-input {
  display: flex;
  gap: 10px;
  padding: 12px 14px;
  border-top: 1px solid var(--border-1);
  align-items: center;
}

.serving-input .el-button {
  height: 38px;
  padding: 0 18px;
  border-radius: 12px;
}

.resolved-faq {
  font-size: 12px;
  color: var(--text-3);
}

.pq-tip {
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-2);
  background: var(--brand-soft);
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 12px;
}
</style>
