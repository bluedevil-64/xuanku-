<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { streamSse } from '../api/sse'
import { useUserStore } from '../stores/user'

const props = defineProps({
  product: { type: Object, required: true },
})

marked.setOptions({ breaks: true, gfm: true })

const store = useUserStore()
const router = useRouter()
const route = useRoute()

const open = ref(false)
const messages = ref([])
const input = ref('')
const streaming = ref(false)
const bodyRef = ref(null)

const QUICK = computed(() => [
  { label: '介绍一下这件商品', text: '用几句话介绍一下这件商品，重点说参数和适合谁。' },
  { label: '值得买吗', text: '结合价格和参数，客观说说值不值得买。' },
  { label: '有现货吗', text: '现在有现货吗？大概多久能发出？' },
])

function renderMd(text) {
  const normalized = (text ?? '').replace(/\n{3,}/g, '\n\n')
  return DOMPurify.sanitize(marked.parse(normalized))
}

function scrollBottom() {
  nextTick(() => {
    const el = bodyRef.value
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  })
}

async function send(text) {
  const q = (text ?? input.value).trim()
  if (!q || streaming.value) return
  if (!store.isLogin) {
    router.push({ path: '/shop/login', query: { redirect: route.fullPath } })
    return
  }

  messages.value.push({ role: 'user', content: q })
  input.value = ''
  streaming.value = true
  messages.value.push({ role: 'assistant', content: '' })
  const target = messages.value[messages.value.length - 1]
  scrollBottom()

  try {
    await streamSse(
      `/api/shop/products/${props.product.id}/chat/stream`,
      { message: q },
      store.token,
      (chunk) => {
        target.content += chunk
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

// 切换商品时清空本地对话（服务端按商品分开存会话）
watch(
  () => props.product?.id,
  () => {
    messages.value = []
    input.value = ''
  },
)

/** 供父组件从「问 AI 导购」入口展开 */
defineExpose({
  expand() {
    open.value = true
  },
})
</script>

<template>
  <section class="advisor" :class="{ open }">
    <button class="head" @click="open = !open">
      <span class="mark">AI</span>
      <span class="titles">
        <strong>AI 商品顾问</strong>
        <em>基于这件商品的资料回答，不编造参数</em>
      </span>
      <span class="chev">{{ open ? '−' : '+' }}</span>
    </button>

    <div v-if="open" class="advisor-body">
      <div v-if="!messages.length" class="intro">
        <p>可以问我这件商品的参数、适用场景、值不值得买。订单与售后问题，点右下角「在线客服」。</p>
        <div class="chips">
          <button v-for="q in QUICK" :key="q.label" @click="send(q.text)">{{ q.label }}</button>
        </div>
      </div>

      <div v-if="messages.length" ref="bodyRef" class="body">
        <div v-for="(m, i) in messages" :key="i" class="row" :class="m.role">
          <div v-if="m.role === 'assistant' && !m.content && streaming" class="bubble typing">
            <span></span><span></span><span></span>
          </div>
          <div v-else-if="m.role === 'assistant'" class="bubble md" v-html="renderMd(m.content)"></div>
          <div v-else class="bubble">{{ m.content }}</div>
        </div>
      </div>

      <div class="input">
        <input
          v-model="input"
          :placeholder="store.isLogin ? '问点关于这件商品的…' : '登录后可以提问'"
          :disabled="streaming"
          @keydown="onKeydown"
        />
        <button :disabled="streaming || !input.trim()" @click="send()">发送</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.advisor {
  margin-top: 28px;
  border-radius: 18px;
  background: #f5f5f7;
  overflow: hidden;
  transition: background-color 0.2s;
}

.head {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 16px 18px;
  border: none;
  background: none;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 9px;
  background: #1d1d1f;
  color: #fff;
  font-size: 11.5px;
  font-weight: 700;
  flex: none;
}

.titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.titles strong {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.2px;
  color: #1d1d1f;
}

.titles em {
  font-style: normal;
  font-size: 11.5px;
  color: #86868b;
}

.chev {
  font-size: 16px;
  color: #86868b;
  flex: none;
  width: 18px;
  text-align: center;
}

.advisor-body {
  padding: 0 18px 18px;
}

.intro p {
  margin: 0 0 12px;
  font-size: 12.5px;
  line-height: 1.6;
  color: #6e6e73;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.chips button {
  padding: 7px 13px;
  border: 0.5px solid rgba(0, 0, 0, 0.12);
  border-radius: 999px;
  background: #fff;
  color: #1d1d1f;
  font-size: 12.5px;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s;
}

.chips button:hover {
  background: #fafafa;
  border-color: rgba(0, 0, 0, 0.3);
}

.body {
  max-height: 280px;
  overflow-y: auto;
  padding: 4px 2px 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.row {
  display: flex;
}

.row.user {
  justify-content: flex-end;
}

.bubble {
  max-width: 88%;
  padding: 9px 13px;
  border-radius: 14px;
  background: #fff;
  color: #1d1d1f;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.row.assistant .bubble {
  border-bottom-left-radius: 5px;
}

.row.user .bubble {
  background: #1d1d1f;
  color: #fff;
  border-bottom-right-radius: 5px;
}

.bubble.md {
  white-space: normal;
}

.bubble.md :deep(p) {
  margin: 0 0 6px;
}

.bubble.md :deep(p:last-child) {
  margin-bottom: 0;
}

.bubble.md :deep(ul),
.bubble.md :deep(ol) {
  margin: 4px 0;
  padding-left: 18px;
}

.bubble.md :deep(strong) {
  font-weight: 600;
}

.bubble.md :deep(table) {
  display: block;
  max-width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
  margin: 6px 0;
  font-size: 12px;
}

.bubble.md :deep(th),
.bubble.md :deep(td) {
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.12);
  padding: 4px 7px;
  white-space: nowrap;
  text-align: left;
}

.bubble.typing {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 12px 15px;
}

.bubble.typing span {
  width: 4px;
  height: 4px;
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
    opacity: 0.3;
    transform: translateY(0);
  }
  40% {
    opacity: 1;
    transform: translateY(-2px);
  }
}

.input {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}

.input input {
  flex: 1;
  height: 40px;
  padding: 0 14px;
  border: none;
  border-radius: 12px;
  background: #fff;
  color: #1d1d1f;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: box-shadow 0.2s;
}

.input input::placeholder {
  color: #a1a1a6;
}

.input input:focus {
  box-shadow: inset 0 0 0 1px #1d1d1f;
}

.input button {
  height: 40px;
  padding: 0 18px;
  border: none;
  border-radius: 12px;
  background: #1d1d1f;
  color: #fff;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.2s;
}

.input button:disabled {
  opacity: 0.3;
  cursor: default;
}
</style>
