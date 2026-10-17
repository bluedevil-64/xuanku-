<script setup>
import { nextTick, ref, watch } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useRouter } from 'vue-router'
import { chatApi } from '../api'
import { streamSse } from '../api/sse'
import { useUserStore } from '../stores/user'

marked.setOptions({ breaks: true, gfm: true })

const open = defineModel('open', { type: Boolean, default: false })

const router = useRouter()
const store = useUserStore()

const messages = ref([])
const input = ref('')
const streaming = ref(false)
const bodyRef = ref(null)
const convId = ref(null)

const QUICK = ['我的订单到哪了', '这款耳机保修多久', '怎么申请退货']

function renderMd(text) {
  // 模型输出常有多余空行，连续 3 个以上换行折叠为段落间距
  const normalized = (text ?? '').replace(/\n{3,}/g, '\n\n')
  return DOMPurify.sanitize(marked.parse(normalized))
}

function scrollBottom() {
  nextTick(() => {
    const el = bodyRef.value
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  })
}

async function ensureSession() {
  if (convId.value) return convId.value
  const conv = await chatApi.createSession()
  convId.value = conv.id
  return conv.id
}

function ask(text) {
  input.value = text
  send()
}

async function send() {
  const text = input.value.trim()
  if (!text || streaming.value) return
  if (!store.isLogin) {
    goLogin()
    return
  }

  messages.value.push({ role: 'user', content: text })
  input.value = ''
  streaming.value = true
  scrollBottom()

  messages.value.push({ role: 'assistant', content: '' })
  const target = messages.value[messages.value.length - 1]

  try {
    const id = await ensureSession()
    await streamSse(
      '/api/chat/stream',
      { conversationId: id, message: text },
      store.token,
      (delta) => {
        target.content += delta
        scrollBottom()
      },
    )
    if (!target.content) target.content = '（暂时没有收到回答，请再试一次）'
  } catch (e) {
    target.content = target.content || `连接失败：${e.message || '请稍后再试'}`
  } finally {
    streaming.value = false
    scrollBottom()
  }
}

function onKeydown(e) {
  if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return
  e.preventDefault()
  send()
}

function goLogin() {
  open.value = false
  router.push({ path: '/shop/login', query: { redirect: '/shop' } })
}

watch(open, (v) => {
  if (v) scrollBottom()
})
</script>

<template>
  <Transition name="panel">
    <section v-if="open" class="service-dock">
      <header class="head">
        <div class="who">
          <span class="avatar">Ai</span>
          <div>
            <div class="title">AiDesk 智能客服</div>
            <div class="sub">
              <span class="live"></span>
              {{ streaming ? '正在输入…' : '在线，通常几秒内回复' }}
            </div>
          </div>
        </div>
        <button class="close" aria-label="关闭" @click="open = false">✕</button>
      </header>

      <div ref="bodyRef" class="body">
        <div v-if="!messages.length" class="hello">
          <h3>你好，我是 AiDesk 智能客服</h3>
          <p>商品咨询、订单进度、售后问题，都可以直接问我。</p>
          <div class="chips">
            <button v-for="q in QUICK" :key="q" @click="ask(q)">{{ q }}</button>
          </div>
        </div>

        <div v-for="(m, i) in messages" :key="i" class="row" :class="m.role">
          <div v-if="m.role === 'assistant' && !m.content && streaming" class="bubble typing">
            <span></span><span></span><span></span>
          </div>
          <div v-else-if="m.role === 'assistant'" class="bubble md" v-html="renderMd(m.content)"></div>
          <div v-else class="bubble">{{ m.content }}</div>
        </div>
      </div>

      <footer class="foot">
        <template v-if="store.isLogin">
          <textarea
            v-model="input"
            rows="1"
            placeholder="问点什么…"
            :disabled="streaming"
            @keydown="onKeydown"
          ></textarea>
          <button class="send" :disabled="streaming || !input.trim()" @click="send">发送</button>
        </template>
        <div v-else class="need-login">
          <span>登录后可咨询订单与售后</span>
          <button @click="goLogin">去登录</button>
        </div>
      </footer>
    </section>
  </Transition>
</template>

<style scoped>
.service-dock {
  position: fixed;
  right: 28px;
  bottom: 28px;
  z-index: 200;
  width: 396px;
  height: min(620px, calc(100vh - 56px));
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 22px;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06), 0 32px 80px -24px rgba(0, 0, 0, 0.45);
}

.panel-enter-active,
.panel-leave-active {
  transition: opacity 0.28s ease, transform 0.36s cubic-bezier(0.32, 0.72, 0, 1);
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(18px) scale(0.98);
}

.head {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.08);
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
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: #1d1d1f;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.2px;
  color: #1d1d1f;
}

.sub {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 2px;
  font-size: 11.5px;
  color: #86868b;
}

.live {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #34c759;
}

.close {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  background: #f5f5f7;
  color: #6e6e73;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.close:hover {
  background: #e8e8ed;
  color: #1d1d1f;
}

.body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 18px 8px;
}

.hello h3 {
  margin: 8px 0 6px;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.4px;
  color: #1d1d1f;
}

.hello p {
  margin: 0 0 18px;
  font-size: 13px;
  line-height: 1.6;
  color: #6e6e73;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chips button {
  padding: 8px 14px;
  border: 0.5px solid rgba(0, 0, 0, 0.1);
  border-radius: 999px;
  background: #fff;
  color: #1d1d1f;
  font-size: 12.5px;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s;
}

.chips button:hover {
  background: #f5f5f7;
  border-color: transparent;
}

.row {
  display: flex;
  margin-bottom: 10px;
}

.row.user {
  justify-content: flex-end;
}

.bubble {
  max-width: 88%;
  padding: 10px 14px;
  border-radius: 16px;
  font-size: 13.5px;
  line-height: 1.62;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 折叠相邻换行，避免回复里出现大片空白 */
.bubble.md :deep(br + br) {
  display: none;
}

.row.assistant .bubble {
  background: #f5f5f7;
  color: #1d1d1f;
  border-bottom-left-radius: 6px;
}

.row.user .bubble {
  background: #1d1d1f;
  color: #fff;
  border-bottom-right-radius: 6px;
}

/* 输入中三点 */
.bubble.typing {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 13px 16px;
}

.bubble.typing span {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #b0b0b6;
  animation: blink 1.2s infinite ease-in-out;
}

.bubble.typing span:nth-child(2) {
  animation-delay: 0.18s;
}

.bubble.typing span:nth-child(3) {
  animation-delay: 0.36s;
}

@keyframes blink {
  0%,
  80%,
  100% {
    opacity: 0.35;
    transform: translateY(0);
  }
  40% {
    opacity: 1;
    transform: translateY(-2px);
  }
}

/* markdown */
.bubble.md :deep(p) {
  margin: 0 0 7px;
}

.bubble.md :deep(p:last-child) {
  margin-bottom: 0;
}

.bubble.md :deep(ul),
.bubble.md :deep(ol) {
  margin: 6px 0;
  padding-left: 18px;
}

.bubble.md :deep(li) {
  margin: 2px 0;
}

.bubble.md :deep(strong) {
  font-weight: 600;
}

.bubble.md :deep(code) {
  background: rgba(0, 0, 0, 0.06);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 12.5px;
}

.bubble.md :deep(table) {
  display: block;
  max-width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
  margin: 8px 0;
  font-size: 12.5px;
}

.bubble.md :deep(th),
.bubble.md :deep(td) {
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.1);
  padding: 5px 8px;
  text-align: left;
  white-space: nowrap;
}

.foot {
  flex: none;
  padding: 12px 16px 16px;
  border-top: 0.5px solid rgba(0, 0, 0, 0.08);
}

.foot textarea {
  width: 100%;
  box-sizing: border-box;
  max-height: 96px;
  padding: 11px 14px;
  border: none;
  border-radius: 14px;
  background: #f5f5f7;
  color: #1d1d1f;
  font-size: 13.5px;
  font-family: inherit;
  line-height: 1.5;
  resize: none;
  outline: none;
}

.foot textarea:focus {
  background: #fff;
  box-shadow: inset 0 0 0 1px #1d1d1f;
}

.send {
  width: 100%;
  height: 38px;
  margin-top: 8px;
  border: none;
  border-radius: 12px;
  background: #1d1d1f;
  color: #fff;
  font-size: 13.5px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.2s, opacity 0.2s;
}

.send:disabled {
  opacity: 0.35;
  cursor: default;
}

.send:not(:disabled):hover {
  background: #000;
}

.need-login {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  color: #6e6e73;
}

.need-login button {
  padding: 8px 16px;
  border: none;
  border-radius: 999px;
  background: #1d1d1f;
  color: #fff;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
}

@media (max-width: 520px) {
  .service-dock {
    right: 12px;
    bottom: 12px;
    width: calc(100vw - 24px);
    height: min(600px, calc(100vh - 24px));
  }
}
</style>
