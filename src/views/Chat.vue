<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { chatApi } from '../api'
import { streamSse } from '../api/sse'
import { useUserStore } from '../stores/user'

marked.setOptions({ breaks: true, gfm: true })

// AI 回答渲染为 markdown（SSE 增量时整条重渲，内容量小可接受）；用户消息保持纯文本
function renderMd(content) {
  return DOMPurify.sanitize(marked.parse(content ?? ''))
}

const store = useUserStore()

/**
 * 后台是「员工身份」的 AI 助手：会话渠道固定 CONSOLE，
 * 与商城里消费者自己的 SHOP 会话完全隔离，不会串到我的历史里。
 */
const CHANNEL = 'CONSOLE'

const sessions = ref([])
const currentId = ref(null)
const keyword = ref('')

const messages = ref([])
const input = ref('')
const streaming = ref(false)
const bodyRef = ref(null)

/** 常用问法：点一下填进输入框，都是坐席每天真正会问的（对应跨客户查询工具） */
const presets = [
  '客户 shopuser 最近有订单吗',
  '订单 AD202610171702500160 现在什么状态',
  '用户催发货，帮我起草一条安抚回复',
  '客户 shopuser 之前提过工单吗',
]

/** 按最近活跃时间分组，比「商品咨询/客服对话」更贴合员工翻历史的方式 */
const groups = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  const list = sessions.value.filter((s) => !kw || (s.title || '').toLowerCase().includes(kw))
  const now = Date.now()
  const day = 86400000
  const buckets = [
    { key: 'today', label: '今天', items: [] },
    { key: 'week', label: '近 7 天', items: [] },
    { key: 'older', label: '更早', items: [] },
  ]
  for (const s of list) {
    const t = s.updateTime ? new Date(s.updateTime).getTime() : 0
    const diff = now - t
    if (diff < day) buckets[0].items.push(s)
    else if (diff < day * 7) buckets[1].items.push(s)
    else buckets[2].items.push(s)
  }
  return buckets.filter((g) => g.items.length)
})

onMounted(async () => {
  await loadSessions()
  if (sessions.value.length > 0) {
    await selectSession(sessions.value[0].id)
  }
})

async function loadSessions() {
  sessions.value = await chatApi.sessions(CHANNEL)
}

async function createSession() {
  if (streaming.value) return
  const conv = await chatApi.createSession(CHANNEL)
  sessions.value.unshift(conv)
  currentId.value = conv.id
  messages.value = []
}

async function selectSession(id) {
  if (streaming.value || currentId.value === id) return
  currentId.value = id
  messages.value = await chatApi.messages(id)
  scrollBottom(false)
}

function scrollBottom(smooth = true) {
  nextTick(() => {
    const el = bodyRef.value
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  })
}

function fmtTime(t) {
  if (!t) return ''
  const d = new Date(t)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function usePreset(text) {
  input.value = text
}

function onKeydown(e) {
  if (e.key !== 'Enter') return
  // Shift+Enter 换行；输入法组合中（中文选字）的 Enter 不发送
  if (e.shiftKey || e.isComposing) return
  e.preventDefault()
  send()
}

async function send() {
  const text = input.value.trim()
  if (!text || streaming.value) return

  // 无会话时自动新建（同样是 CONSOLE 渠道）
  if (!currentId.value) {
    const conv = await chatApi.createSession(CHANNEL)
    sessions.value.unshift(conv)
    currentId.value = conv.id
  }

  messages.value.push({ role: 'user', content: text })
  input.value = ''
  streaming.value = true
  scrollBottom()

  const assistant = reactive({ role: 'assistant', content: '' })
  messages.value.push(assistant)

  try {
    await streamSse(
      '/api/chat/stream',
      { conversationId: currentId.value, message: text },
      store.token,
      (delta) => {
        assistant.content += delta
        scrollBottom()
      },
    )
    if (!assistant.content) assistant.content = '（暂时没有收到回答，请再试一次）'
  } catch (e) {
    ElMessage.error(e.message || '对话失败')
    if (!assistant.content) {
      assistant.content = '（回答生成失败，请重试）'
    }
  } finally {
    streaming.value = false
    scrollBottom()
    loadSessions()
  }
}
</script>

<template>
  <div class="chat-layout">
    <!-- 左侧会话列表 -->
    <aside class="session-panel">
      <el-button type="primary" class="new-btn" :disabled="streaming" @click="createSession">
        新建对话
      </el-button>
      <el-input
        v-model="keyword"
        class="session-search"
        placeholder="搜索对话"
        size="small"
        clearable
      />
      <div class="session-list">
        <div v-for="g in groups" :key="g.key" class="session-group">
          <div class="group-label">
            <span>{{ g.label }}</span>
            <em>{{ g.items.length }}</em>
          </div>
          <div
            v-for="s in g.items"
            :key="s.id"
            class="session-item"
            :class="{ active: s.id === currentId }"
            @click="selectSession(s.id)"
          >
            <span class="s-thumb s-thumb-ph">AI</span>
            <div class="s-body">
              <div class="session-title">{{ s.title }}</div>
              <div class="session-time">{{ fmtTime(s.updateTime) }}</div>
            </div>
          </div>
        </div>
        <el-empty v-if="sessions.length === 0" description="暂无对话" :image-size="60" />
        <p v-else-if="groups.length === 0" class="no-match">没有匹配的会话</p>
      </div>
    </aside>

    <!-- 右侧对话区 -->
    <section class="chat-panel">
      <div class="chat-toolbar">
        <span class="tb-title">AI 助手 · 员工视角</span>
        <span class="tb-hint">查订单、查工单、起草对客回复、梳理会话</span>
        <router-link to="/admin/rules" class="tb-link">回答规则</router-link>
      </div>

      <div ref="bodyRef" class="chat-body">
        <div v-if="currentId === null" class="empty-wrap">
          <p class="empty-title">你想先处理哪件事？</p>
          <div class="preset-list">
            <button v-for="p in presets" :key="p" class="preset" @click="usePreset(p)">
              {{ p }}
            </button>
          </div>
        </div>
        <template v-else>
          <div v-for="(m, i) in messages" :key="i" class="msg-row" :class="m.role">
            <div class="avatar">{{ m.role === 'user' ? '我' : 'AI' }}</div>
            <div v-if="m.role === 'assistant'" class="bubble md" v-html="renderMd(m.content)"></div>
            <div v-else class="bubble">{{ m.content }}</div>
          </div>
          <div v-if="messages.length === 0" class="preset-list preset-inline">
            <button v-for="p in presets" :key="p" class="preset" @click="usePreset(p)">
              {{ p }}
            </button>
          </div>
        </template>
      </div>

      <div class="chat-input">
        <el-input
          v-model="input"
          type="textarea"
          :rows="3"
          resize="none"
          placeholder="以员工身份提问，例如「这单为什么还没发货」。Enter 发送，Shift+Enter 换行"
          :disabled="streaming"
          @keydown="onKeydown"
        />
        <el-button type="primary" :loading="streaming" :disabled="!input.trim()" @click="send">
          {{ streaming ? '回答中' : '发送' }}
        </el-button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.chat-layout {
  display: flex;
  height: 100%;
  gap: 14px;
}

/* ===== 左侧会话列表 ===== */
.session-panel {
  width: 272px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 14px;
  border-radius: var(--radius-card);
  border: 1px solid var(--border-1);
  background: #fff;
}

.new-btn {
  width: 100%;
  height: 40px;
  border-radius: var(--radius-ctrl);
}

.new-btn:not(.is-disabled):active {
  transform: scale(0.97);
}

.session-list {
  margin-top: 12px;
  overflow-y: auto;
  flex: 1;
  margin-right: -6px;
  padding-right: 6px;
}

.session-search {
  margin: 4px 0 12px;
}

.session-group {
  margin-bottom: 14px;
}

.group-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px 8px;
  font-size: 10.5px;
  letter-spacing: 0.12em;
  color: var(--text-3);
}

.group-label em {
  font-style: normal;
  font-variant-numeric: tabular-nums;
  opacity: 0.7;
}

.s-thumb {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  object-fit: cover;
  flex: none;
}

.s-thumb-ph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--fill-1);
  color: var(--text-3);
  font-size: 10px;
}

.s-body {
  flex: 1;
  min-width: 0;
}

.no-match {
  padding: 24px 0;
  text-align: center;
  font-size: 12.5px;
  color: var(--text-3);
}

.session-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 12px;
  cursor: pointer;
  margin-bottom: 2px;
  transition: background-color 0.2s var(--ease-ios), transform 0.2s var(--ease-ios);
}

.session-item:hover {
  background: var(--fill-2);
}

.session-item:active {
  transform: scale(0.985);
}

.session-item.active {
  background: var(--brand-soft);
}

.session-item.active .session-title {
  color: var(--brand);
  font-weight: 590;
}

.session-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-time {
  font-size: 12px;
  color: var(--text-3);
  margin-top: 3px;
}

/* ===== 右侧对话面板 ===== */
.chat-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  border-radius: var(--radius-card);
  border: 1px solid var(--border-1);
  background: #fff;
  overflow: hidden;
}

.chat-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 20px;
  min-height: 56px;
  border-bottom: 1px solid var(--border-1);
  background: #fff;
}

.tb-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-1);
  letter-spacing: -0.1px;
}

.tb-hint {
  font-size: 12.5px;
  color: var(--text-3);
}

.tb-link {
  margin-left: auto;
  font-size: 12.5px;
  color: var(--text-2);
  text-decoration: none;
  padding: 5px 12px;
  border-radius: 999px;
  background: var(--fill-2);
  transition: background-color 0.2s var(--ease-ios);
}

.tb-link:hover {
  background: var(--fill-1);
  color: var(--text-1);
}

.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px 24px 8px;
  scroll-behavior: smooth;
}

/* ===== 空状态：常用问法 ===== */
.empty-wrap {
  padding-top: 28px;
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.4px;
  color: var(--text-1);
  margin: 0 0 18px;
}

.preset-list {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
}

.preset-inline {
  margin-top: 4px;
  padding-bottom: 8px;
}

.preset {
  font-family: inherit;
  font-size: 13px;
  color: var(--text-2);
  background: #fff;
  border: 1px solid var(--border-1);
  border-radius: 999px;
  padding: 8px 15px;
  cursor: pointer;
  transition: color 0.2s var(--ease-ios), border-color 0.2s var(--ease-ios),
    transform 0.2s var(--ease-ios), background-color 0.2s var(--ease-ios);
}

.preset:hover {
  color: var(--text-1);
  border-color: rgba(0, 0, 0, 0.24);
  background: var(--fill-2);
}

.preset:active {
  transform: scale(0.97);
}

/* ===== 消息气泡：iMessage 风 ===== */
.msg-row {
  display: flex;
  align-items: flex-end;
  gap: 9px;
  margin-bottom: 14px;
  animation: msg-in 0.34s var(--ease-ios) both;
}

@keyframes msg-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.msg-row.user {
  flex-direction: row-reverse;
}

.avatar {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(180deg, #8e8e93 0%, #636366 100%);
  box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.35);
}

.msg-row.user .avatar {
  background: linear-gradient(180deg, #4a4a4c 0%, #1d1d1f 100%);
}

.bubble {
  max-width: 72%;
  padding: 9px 15px;
  border-radius: var(--radius-bubble);
  border: none;
  background: var(--fill-1);
  color: var(--text-1);
  font-size: 14.5px;
  line-height: 1.58;
  white-space: pre-wrap;
  word-break: break-word;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.03);
}

.msg-row:not(.user) .bubble {
  border-bottom-left-radius: 6px;
}

.msg-row.user .bubble {
  background: var(--brand-gradient);
  color: #fff;
  border-bottom-right-radius: 6px;
  box-shadow: none;
}

/* ===== AI 回答 markdown ===== */
.bubble.md {
  white-space: normal;
}

.bubble.md :deep(p) {
  margin: 0 0 8px;
}

.bubble.md :deep(p:last-child) {
  margin-bottom: 0;
}

.bubble.md :deep(pre) {
  background: #1c1c1e;
  color: #f2f2f7;
  padding: 12px 14px;
  border-radius: 12px;
  overflow-x: auto;
  margin: 10px 0;
  box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.08);
}

.bubble.md :deep(code) {
  font-family: ui-monospace, 'SF Mono', Consolas, Monaco, monospace;
  font-size: 12.5px;
}

.bubble.md :deep(:not(pre) > code) {
  background: rgba(118, 118, 128, 0.16);
  padding: 1px 5px;
  border-radius: 5px;
}

.bubble.md :deep(table) {
  border-collapse: collapse;
  margin: 10px 0;
  max-width: 100%;
  display: block;
  overflow-x: auto;
  border-radius: 10px;
}

.bubble.md :deep(th),
.bubble.md :deep(td) {
  border: 1px solid var(--border-1);
  padding: 5px 11px;
  font-size: 13px;
}

.bubble.md :deep(th) {
  background: var(--fill-2);
  font-weight: 600;
}

.bubble.md :deep(ul),
.bubble.md :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
}

.bubble.md :deep(h1),
.bubble.md :deep(h2),
.bubble.md :deep(h3),
.bubble.md :deep(h4) {
  font-size: 14.5px;
  font-weight: 650;
  letter-spacing: -0.2px;
  margin: 10px 0 6px;
}

.bubble.md :deep(blockquote) {
  margin: 8px 0;
  padding: 2px 12px;
  border-left: 3px solid var(--brand);
  color: var(--text-2);
  background: var(--brand-soft);
  border-radius: 0 8px 8px 0;
}

.bubble.md :deep(a) {
  color: var(--text-1);
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* ===== 输入区 ===== */
.chat-input {
  display: flex;
  gap: 10px;
  padding: 12px 20px 16px;
  border-top: 1px solid var(--border-1);
  background: #fff;
  align-items: flex-end;
}

.chat-input :deep(.el-textarea__inner) {
  border-radius: 18px;
  background: var(--fill-2);
  padding: 11px 16px;
  font-size: 14.5px;
  font-family: inherit;
  line-height: 1.5;
  box-shadow: none;
}

.chat-input :deep(.el-textarea__inner:hover) {
  background: rgba(118, 118, 128, 0.14);
}

.chat-input :deep(.el-textarea__inner:focus) {
  background: #fff;
  box-shadow: inset 0 0 0 1px var(--text-1) !important;
}

.chat-input .el-button {
  height: 44px;
  padding: 0 22px;
  border-radius: 14px;
  font-size: 14.5px;
}
</style>
