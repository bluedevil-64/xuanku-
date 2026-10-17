<script setup>
/**
 * 纯前端 AI 导购面板。
 * 静态站没有后端 SSE，这里用本地规则 + 打字机把「问 AI」这条交互补完整，
 * 数据取自打包快照 demo/products.json，不依赖任何接口。
 */
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { demoProducts } from '../api/demo'

const props = defineProps({ open: { type: Boolean, default: false } })
const emit = defineEmits(['update:open'])

const msgs = ref([
  {
    role: 'ai',
    text: "Hi — I'm the concierge. What are you looking for? Give me a budget, a use case or a vibe, and I'll narrow it down.",
  },
])
const input = ref('')
const typing = ref(false)
const bodyRef = ref(null)

const QUICK = ['Best under ¥3,000', 'Recommend ANC headphones', 'A sofa for my living room', "What's new"]

let timer = null
let catalog = []

async function ensureCatalog() {
  if (catalog.length) return catalog
  const page = await demoProducts({ size: 60 })
  catalog = page.records || []
  return catalog
}

function money(v) {
  return Number(v ?? 0).toLocaleString('zh-CN', { maximumFractionDigits: 0 })
}

function pick(list, n = 3) {
  return list.slice(0, n).map((p) => `· ${p.name} — ¥${money(p.price)}`).join('\n')
}

/** 本地意图匹配：预算 / 类别 / 推荐 / 寒暄 */
async function compose(q) {
  const list = await ensureCatalog()
  if (!list.length) return 'Product data has not loaded yet — ask me again in a second.'

  const num = q.match(/(\d{2,6})/)
  const budget = num ? Number(num[1]) : 0

  const hit = list.filter((p) =>
    [p.name, p.subtitle, p.category, p.description].filter(Boolean).some((t) => q.includes(t)),
  )
  if (hit.length) {
    const p = hit[0]
    return [
      `${p.name} — ¥${money(p.price)}.`,
      p.subtitle || '',
      p.description ? `${p.description.slice(0, 90)}…` : '',
      'Want me to add it to the cart?',
    ]
      .filter(Boolean)
      .join('\n')
  }

  if (/降噪|耳机|听歌|headphone|anc|audio|music/i.test(q)) {
    const hs = list.filter((p) => /耳机|音箱|音频|headphone|earbuds|speaker|audio/i.test(`${p.name}${p.category}`))
    if (hs.length) return `Here is the audio lineup:\n${pick(hs, 3)}\nFor daily listening I'd take the first one; commuting, check battery life first.`
  }

  if (/沙发|客厅|家具|椅|sofa|couch|chair|living/i.test(q)) {
    const fs = list.filter((p) => /沙发|家具|椅|桌|sofa|couch|chair|table|furniture/i.test(`${p.name}${p.category}`))
    if (fs.length) return `For the living room, look at these:\n${pick(fs, 3)}\nSmall spaces: narrow arms and a ~90cm seat depth are safest.`
  }

  if (budget) {
    const fits = list.filter((p) => Number(p.price) <= budget).sort((a, b) => b.sales - a.sales)
    if (fits.length) {
      return `Under ${budget}, top three by reputation:\n${pick(fits, 3)}\nAt this price skip spec-chasing and take the best-seller.`
    }
    return `Nothing fits under ${budget} yet — the cheapest starts around ¥${money(
      Math.min(...list.map((p) => Number(p.price))),
    )}. Want installments or second-hand instead?`
  }

  if (/新|上新|最近|new|arrival|recent/i.test(q)) {
    const fresh = [...list].sort((a, b) => Number(b.id) - Number(a.id))
    return `Fresh arrivals:\n${pick(fresh, 3)}\nNew drops hold their price — wait two weeks for a discount.`
  }

  if (/便宜|性价比|划算|cheap|value|deal/i.test(q)) {
    const cheap = [...list].sort((a, b) => Number(a.price) - Number(b.price))
    return `Budget-first picks:\n${pick(cheap, 3)}\nThese three have the lowest return rates in their price band.`
  }

  const top = [...list].sort((a, b) => Number(b.sales || 0) - Number(a.sales || 0))
  return `Top three by sales:\n${pick(top, 3)}\nWant sharper picks? Tell me a budget or a use case — e.g. "an office chair under ¥4,000".`
}

async function scrollBottom() {
  await nextTick()
  const el = bodyRef.value
  if (el) el.scrollTop = el.scrollHeight
}

async function ask(text) {
  const q = String(text ?? input.value).trim()
  if (!q || typing.value) return
  input.value = ''
  msgs.value.push({ role: 'me', text: q })
  await scrollBottom()

  typing.value = true
  const full = await compose(q)
  msgs.value.push({ role: 'ai', text: '' })
  const idx = msgs.value.length - 1

  let i = 0
  clearInterval(timer)
  timer = setInterval(() => {
    // 中文按字推进，比整段闪现自然
    i += 1
    msgs.value[idx].text = full.slice(0, i)
    if (i % 4 === 0) scrollBottom()
    if (i >= full.length) {
      clearInterval(timer)
      timer = null
      typing.value = false
      scrollBottom()
    }
  }, 16)
}

function close() {
  emit('update:open', false)
}

watch(
  () => props.open,
  (v) => {
    if (v) scrollBottom()
  },
)

onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div class="dock" :class="{ open }">
    <Transition name="panel">
      <section v-if="open" class="panel" aria-label="AI Concierge">
        <header class="panel-head">
          <span class="orb"></span>
          <div class="who">
            <strong>AI Concierge</strong>
            <span>Local demo · works offline</span>
          </div>
          <button class="x" @click="close" aria-label="Close">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
            </svg>
          </button>
        </header>

        <div ref="bodyRef" class="panel-body">
          <div v-for="(m, i) in msgs" :key="i" class="row" :class="m.role">
            <p class="bubble">{{ m.text }}<span v-if="typing && i === msgs.length - 1" class="caret"></span></p>
          </div>
        </div>

        <div class="panel-foot">
          <div class="chips">
            <button v-for="c in QUICK" :key="c" class="chip" @click="ask(c)">{{ c }}</button>
          </div>
          <form class="composer" @submit.prevent="ask()">
            <input v-model="input" placeholder="Budget, use case, or a vibe…" :disabled="typing" />
            <button type="submit" :disabled="typing || !input.trim()" aria-label="Send">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9">
                <path d="M5 12h13M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </form>
        </div>
      </section>
    </Transition>

    <button class="fab" :class="{ on: open }" @click="emit('update:open', !open)">
      <span class="ripple"></span>
      <svg v-if="!open" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.7">
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" stroke-linecap="round" />
      </svg>
      <svg v-else viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9">
        <path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
      </svg>
      <span class="fab-text">AI Concierge</span>
    </button>
  </div>
</template>

<style scoped>
.dock {
  position: fixed;
  right: 26px;
  bottom: 26px;
  z-index: 120;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 14px;
}

/* 悬浮按钮 */
.fab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  height: 48px;
  padding: 0 20px 0 16px;
  border: none;
  border-radius: 999px;
  background: #1d1d1f;
  color: #fff;
  font-size: 13.5px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  box-shadow: 0 12px 32px -10px rgba(0, 0, 0, 0.45);
  transition: transform 0.35s var(--ease-out), background-color 0.2s;
}

.fab:hover {
  transform: translateY(-2px);
  background: #000;
}

.fab.on {
  background: #1d1d1f;
  box-shadow: 0 12px 32px -10px rgba(0, 0, 0, 0.45);
}

.fab-text {
  letter-spacing: 0.02em;
}

.ripple {
  position: absolute;
  inset: -1px;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.22);
  animation: ripple 3.4s ease-out infinite;
  pointer-events: none;
}

@keyframes ripple {
  0% {
    opacity: 0.7;
    transform: scale(1);
  }
  70%,
  100% {
    opacity: 0;
    transform: scale(1.18);
  }
}

/* 面板 */
.panel {
  width: min(392px, calc(100vw - 44px));
  height: min(556px, calc(100vh - 130px));
  display: flex;
  flex-direction: column;
  border-radius: 24px;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(20, 20, 29, 0.94), rgba(10, 10, 15, 0.96));
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 40px 100px -30px rgba(0, 0, 0, 1), inset 0 1px 0 rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(26px) saturate(150%);
  -webkit-backdrop-filter: blur(26px) saturate(150%);
}

/* 顶部一条极光描边 */
.panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--brand-gradient);
  opacity: 0.85;
}

.panel {
  position: relative;
}

.panel-head {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 16px 16px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
}

.orb {
  width: 10px;
  height: 10px;
  flex: none;
  border-radius: 50%;
  background: var(--brand-gradient);
  box-shadow: 0 0 0 4px rgba(124, 108, 255, 0.16), 0 0 14px 2px rgba(124, 108, 255, 0.8);
}

.panel-head .who {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
  min-width: 0;
}

.panel-head strong {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-1);
}

.panel-head span {
  font-size: 11px;
  color: var(--text-3);
}

.x {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-2);
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s;
}

.x:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-1);
}

.panel-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 18px 16px 8px;
  scrollbar-width: thin;
}

.row {
  display: flex;
  margin-bottom: 12px;
}

.row.me {
  justify-content: flex-end;
}

.bubble {
  margin: 0;
  max-width: 86%;
  padding: 11px 14px;
  border-radius: 16px;
  font-size: 13px;
  line-height: 1.72;
  white-space: pre-wrap;
  word-break: break-word;
}

.row.ai .bubble {
  background: rgba(255, 255, 255, 0.055);
  border: 1px solid rgba(255, 255, 255, 0.07);
  color: #dcdce3;
  border-bottom-left-radius: 6px;
}

.row.me .bubble {
  background: linear-gradient(140deg, rgba(124, 108, 255, 0.9), rgba(92, 74, 214, 0.9));
  color: #fff;
  border-bottom-right-radius: 6px;
  box-shadow: 0 12px 28px -14px rgba(124, 108, 255, 0.9);
}

.caret {
  display: inline-block;
  width: 2px;
  height: 13px;
  margin-left: 2px;
  vertical-align: -2px;
  background: var(--accent-2);
  animation: blink 1s steps(2, start) infinite;
}

@keyframes blink {
  to {
    opacity: 0;
  }
}

.panel-foot {
  padding: 10px 14px 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.chips {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 10px;
  scrollbar-width: none;
}

.chips::-webkit-scrollbar {
  display: none;
}

.chip {
  flex: none;
  height: 28px;
  padding: 0 11px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-2);
  font-size: 11.5px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.2s, border-color 0.2s, background-color 0.2s;
}

.chip:hover {
  color: var(--text-1);
  border-color: var(--brand-border);
  background: rgba(124, 108, 255, 0.12);
}

.composer {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 0 6px 0 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.045);
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: border-color 0.2s, background-color 0.2s;
}

.composer:focus-within {
  border-color: var(--brand-border);
  background: rgba(255, 255, 255, 0.06);
}

.composer input {
  flex: 1;
  min-width: 0;
  border: none;
  background: none;
  outline: none;
  color: var(--text-1);
  font-size: 13px;
  font-family: inherit;
}

.composer input::placeholder {
  color: var(--text-3);
}

.composer button {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 10px;
  background: var(--brand-gradient);
  color: #0a0a0f;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.2s var(--ease-out);
}

.composer button:disabled {
  opacity: 0.32;
  cursor: default;
}

.composer button:not(:disabled):hover {
  transform: scale(1.05);
}

.panel-enter-active,
.panel-leave-active {
  transition: opacity 0.32s var(--ease-out), transform 0.38s var(--ease-out);
  transform-origin: bottom right;
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(14px) scale(0.96);
}

@media (max-width: 520px) {
  .dock {
    right: 14px;
    bottom: 14px;
  }
  .panel {
    height: min(520px, calc(100vh - 110px));
  }
  .fab-text {
    display: none;
  }
  .fab {
    width: 52px;
    height: 52px;
    padding: 0;
    justify-content: center;
    border-radius: 50%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ripple {
    animation: none;
  }
  .caret {
    animation: none;
  }
}
</style>
