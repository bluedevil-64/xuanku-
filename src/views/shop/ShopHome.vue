<script setup>
import { computed, inject, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { shopApi } from '../../api'
import { demoProducts, demoCategories } from '../../api/demo'
import { useCartStore } from '../../stores/cart'
import { ElMessage } from 'element-plus'
import WavesBg from '../../components/WavesBg.vue'

const route = useRoute()
const router = useRouter()
const openChat = inject('openChat', () => {})
const cart = useCartStore()

const products = ref([])
const cats = ref([])
const category = ref(route.query.c || '')
const sort = ref('default')
const loading = ref(true)

/** 滚动进度：只用来做 hero 视差与导航态，不驱动布局 */
const scrollY = ref(0)
let raf = 0

/** 逐字标题：第一行拆成单字错峰入场；第二行是渐变文字，只能整行动画 */
const TITLE_L1 = 'Good design,'

/** 数据条数字滚动 */
const shown = reactive({ products: 0, cats: 0, hours: 0 })

function animateCount(key, target, dur = 1000) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    shown[key] = target
    return
  }
  const t0 = performance.now()
  const from = shown[key]
  const tick = (t) => {
    const k = Math.min(1, (t - t0) / dur)
    const e = 1 - Math.pow(1 - k, 3)
    shown[key] = Math.round(from + (target - from) * e)
    if (k < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

const SORTS = [
  { key: 'default', label: 'Default' },
  { key: 'new', label: 'Newest' },
  { key: 'price_asc', label: 'Price ↑' },
  { key: 'price_desc', label: 'Price ↓' },
]


async function load() {
  loading.value = true
  try {
    const page = await shopApi.products(
      { category: category.value || undefined, sort: sort.value, size: 24 },
      true,
    )
    products.value = page.records || []
  } catch {
    // 接口不可用（纯静态部署）时退回打包快照，页面仍可浏览
    const page = await demoProducts({
      category: category.value || undefined,
      sort: sort.value,
      size: 24,
    })
    products.value = page.records || []
  } finally {
    loading.value = false
    animateCount('products', products.value.length || 12)
  }
}

function setCat(name) {
  if (category.value === name) return
  category.value = name
  router.replace({ query: name ? { c: name } : {} })
}

watch([category, sort], load)

onMounted(() => {
  load()
  shopApi
    .categories(true)
    .then((list) => {
      cats.value = list
      animateCount('cats', list.length || 8)
    })
    .catch(() =>
      demoCategories().then((list) => {
        cats.value = list
        animateCount('cats', list.length || 8)
      }),
    )
  animateCount('hours', 24, 1300)

  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  cancelAnimationFrame(raf)
})

function onScroll() {
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(() => {
    scrollY.value = window.scrollY
  })
}

function money(v) {
  return Number(v ?? 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

/** 卡片快速加购：不进详情页，一键入车 */
function quickAdd(p) {
  cart.add(p, 1)
  ElMessage.success(`Added to cart · ${p.name}`)
}

/** 前端本地搜索：静态站友好，不依赖接口 */
const search = ref('')
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return products.value
  return products.value.filter((p) =>
    [p.name, p.subtitle, p.category].filter(Boolean).some((t) => String(t).toLowerCase().includes(q)),
  )
})

/** 图片解码完成后再淡入，避免黑块闪一下 */
const loaded = reactive(new Set())
function onImgLoad(id) {
  loaded.add(id)
}

/** 卡片光斑：仅更新 CSS 变量，动效交给 CSS（Apple 式：不用 tilt / rotate） */
function cardMove(e) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${e.clientX - r.left}px`)
  el.style.setProperty('--my', `${e.clientY - r.top}px`)
}

/** 用 id 各位数字之和决定抽象图形，避免相邻 id 形状重复 */
function shapeOf(id) {
  return String(id)
    .split('')
    .reduce((n, c) => n + Number(c), 0) % 4
}

/** hero 视差：位移 0.18 倍并淡出，上限 720px 防止长页面拖影 */
const heroStyle = computed(() => {
  const y = Math.min(scrollY.value, 720)
  return {
    transform: `translate3d(0, ${y * 0.18}px, 0)`,
    opacity: String(Math.max(0, 1 - y / 620)),
  }
})
</script>

<template>
  <div class="home">
    <!-- ============ HERO ============ -->
    <section class="hero">
      <WavesBg class="hero-waves" />
 <div class="hero-inner" :style="heroStyle">
        <p class="eyebrow hero-in">Selected Objects · 2026</p>

        <h1 class="title">
          <span class="line">
            <span
              v-for="(ch, i) in TITLE_L1"
              :key="`a${i}`"
              class="ch"
              :style="{ '--d': `${0.12 + i * 0.055}s` }"
              >{{ ch === ' ' ? '\u00A0' : ch }}</span
            >
          </span>
          <span class="line grad-text ch-line" :style="{ '--d': '0.4s' }">comes home.</span>
        </h1>

        <div class="cta hero-in">
          <a class="primary" href="#catalog">
            <span class="label">Start browsing</span>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h13M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </a>
          <button class="ghost" @click="openChat">
            <span class="spark"></span>
            Ask the AI concierge
          </button>
        </div>

        <dl class="stats hero-in">
          <div>
            <dt>{{ shown.products }}</dt>
            <dd>in catalog</dd>
          </div>
          <span class="rule"></span>
          <div>
            <dt>{{ shown.cats }}</dt>
            <dd>categories</dd>
          </div>
          <span class="rule"></span>
          <div>
            <dt>{{ shown.hours }}h</dt>
            <dd>dispatch via SF</dd>
          </div>
        </dl>
      </div>

      <div class="scroll-hint" aria-hidden="true">
        <span class="rail"><span class="bead"></span></span>
        <span class="txt">SCROLL</span>
      </div>
    </section>

    <!-- ============ 滚动字条 ============ -->
    <div class="marquee" aria-hidden="true">
      <div class="track">
        <span v-for="i in 2" :key="i" class="seq">
          New Arrivals · Curated Objects · Good Design · Quiet Living · Selected Objects ·
        </span>
      </div>
    </div>

    <!-- ============ 商品目录 ============ -->
    <section id="catalog" class="catalog">
      <header class="cat-head">
        <div>
          <p class="eyebrow">01 · Catalog</p>
          <h2 class="cat-title">All objects</h2>
        </div>
        <label class="search">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" stroke-linecap="round" />
          </svg>
          <input v-model="search" placeholder="Search objects…" />
          <button v-if="search" class="clear" aria-label="Clear search" @click="search = ''">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 6l12 12M18 6L6 18" stroke-linecap="round" />
            </svg>
          </button>
        </label>
      </header>

      <div class="filters">
        <div class="cats">
          <button :class="{ on: !category }" @click="setCat('')">All</button>
          <button
            v-for="c in cats"
            :key="c.name"
            :class="{ on: category === c.name }"
            @click="setCat(c.name)"
          >
            {{ c.name }}<span class="n">{{ c.count }}</span>
          </button>
        </div>
        <div class="sorts">
          <button
            v-for="s in SORTS"
            :key="s.key"
            :class="{ on: sort === s.key }"
            @click="sort = s.key"
          >
            {{ s.label }}
          </button>
        </div>
      </div>

      <div v-if="loading" class="grid">
        <div v-for="i in 8" :key="i" class="skeleton"></div>
      </div>

      <div v-else class="grid" :key="category + sort">
        <router-link
          v-for="(p, i) in filtered"
          :key="p.id"
          :to="`/shop/p/${p.id}`"
          class="card"
          v-reveal="{ delay: (i % 4) * 70 }"
        >
          <div class="card-inner" @mousemove="cardMove">
            <div class="visual" :class="[`tone-${p.tone}`, `s${shapeOf(p.id)}`]">
              <img
                v-if="p.image"
                :src="p.image"
                :alt="p.name"
                class="photo"
                :class="{ loaded: loaded.has(p.id) }"
                loading="lazy"
                @load="onImgLoad(p.id)"
              />
              <span v-else class="shape"></span>
            <span v-if="p.tag" class="tag">{{ p.tag }}</span>
            <button
              class="quick"
              :aria-label="`Add ${p.name} to cart`"
              :title="'Add to cart'"
              @click.prevent.stop="quickAdd(p)"
            >
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 5v14M5 12h14" stroke-linecap="round" />
              </svg>
            </button>
            </div>

            <div class="meta">
              <div class="meta-top">
                <h3 :title="p.name">{{ p.name }}</h3>
                <span class="arrow">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M7 17L17 7M9 7h8v8" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </span>
              </div>
              <div class="price-row">
                <span class="price">¥{{ money(p.price) }}</span>
                <s v-if="p.originalPrice" class="was">¥{{ money(p.originalPrice) }}</s>
              </div>
            </div>

            <span class="spot" aria-hidden="true"></span>
          </div>
        </router-link>
      </div>

      <p v-if="!loading && !filtered.length" class="empty">
        {{ search ? `No matches for “${search}”` : 'Nothing in this category yet — try another' }}
      </p>
    </section>

    <!-- ============ 尾部 CTA ============ -->
    <section class="outro">
      <p class="eyebrow">02 · Concierge</p>
      <h2 class="outro-title">
        Let the AI pick<br />
        <span class="grad-text">the right one</span>
      </h2>
      <button class="outro-btn" @click="openChat">
        Chat with the concierge
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 12h13M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </section>
  </div>
</template>

<style scoped>
.home {
  position: relative;
}

/* ================= HERO ================= */
.hero {
  position: relative;
  min-height: 92vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 32px 120px;
  overflow: hidden;
  isolation: isolate;
}

/* 波浪线画布：垫在最底层，光晕之下 */
.hero-waves {
  position: absolute;
  inset: 0;
  z-index: 0;
}

/* 鼠标聚光：极淡暗晕跟随，白纸被轻轻压出一块阴影 */


.hero-inner {
  position: relative;
  z-index: 1;
  max-width: 1060px;
  text-align: center;
  will-change: transform, opacity;
}

.hero .eyebrow {
  margin: 0 0 26px;
  color: #86868b;
}

.title {
  margin: 0;
  font-size: clamp(50px, 9vw, 128px);
  font-weight: 600;
  line-height: 0.96;
  letter-spacing: -0.05em;
  color: var(--text-1);
}

.title .line {
  display: block;
}

.title .line + .line {
  margin-top: 0.04em;
}

/* 逐字入场：blur + 上浮 + 轻微旋转，按 --d 错峰。
   fill-mode 用 backwards——结束后不保留 to 帧，transform 交还给常规样式，
   这样每个字符还能响应 :hover 跳起。 */
.title .ch {
  display: inline-block;
  animation: hero-char 0.95s var(--ease-out) backwards;
  animation-delay: var(--d, 0s);
  transition: transform 0.4s var(--ease-out);
}

/* 渐变行整体入场（background-clip:text 不能拆字，拆了裁剪会失效） */
.title .ch-line {
  display: block;
  animation: hero-char 0.95s var(--ease-out) both;
  animation-delay: var(--d, 0s);
}

@keyframes hero-char {
  from {
    opacity: 0;
    transform: translateY(30px) rotate(3.5deg);
    filter: blur(12px);
  }
  to {
    opacity: 1;
    transform: none;
    filter: blur(0);
  }
}

.cta {
  margin-top: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  flex-wrap: wrap;
}

.primary {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  height: 50px;
  padding: 0 28px;
  border-radius: 999px;
  background: #1d1d1f;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: background-color 0.2s, transform 0.45s var(--ease-out), box-shadow 0.45s var(--ease-out);
}

.primary:hover {
  background: #000;
  transform: translateY(-2px);
  box-shadow: 0 18px 36px -20px rgba(0, 0, 0, 0.45);
}

.ghost {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  height: 50px;
  padding: 0 24px;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: #fff;
  color: var(--text-1);
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.3s, box-shadow 0.3s, transform 0.3s var(--ease-out);
}

.ghost:hover {
  border-color: rgba(0, 0, 0, 0.4);
  box-shadow: 0 14px 30px -18px rgba(0, 0, 0, 0.4);
  transform: translateY(-1px);
}

.spark {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #34c759;
  box-shadow: 0 0 0 3px rgba(52, 199, 89, 0.16);
}

.stats {
  display: inline-flex;
  align-items: center;
  gap: 26px;
  margin: 58px 0 0;
  padding: 16px 30px;
  border-radius: 20px;
  border: 1px solid rgba(0, 0, 0, 0.07);
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(12px);
}

.stats > div {
  text-align: left;
}

.stats dt {
  font-size: 19px;
  font-weight: 600;
  letter-spacing: -0.03em;
  color: var(--text-1);
  font-variant-numeric: tabular-nums;
}

.stats dd {
  margin: 3px 0 0;
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--text-3);
}

.stats .rule {
  width: 1px;
  height: 26px;
  background: rgba(0, 0, 0, 0.08);
}

/* 滚动提示 */
.scroll-hint {
  position: absolute;
  left: 50%;
  bottom: 34px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.rail {
  position: relative;
  width: 1px;
  height: 46px;
  background: rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.bead {
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  height: 14px;
  background: linear-gradient(180deg, transparent, #1d1d1f);
  animation: bead 2.4s var(--ease-out) infinite;
}

@keyframes bead {
  0% {
    transform: translateY(-16px);
    opacity: 0;
  }
  40% {
    opacity: 1;
  }
  100% {
    transform: translateY(46px);
    opacity: 0;
  }
}

.scroll-hint .txt {
  font-size: 9.5px;
  letter-spacing: 0.34em;
  color: #b0b0b8;
}

/* ================= MARQUEE ================= */
.marquee {
  position: relative;
  padding: 26px 0;
  border-top: 1px solid var(--hairline);
  border-bottom: 1px solid var(--hairline);
  overflow: hidden;
  mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
}

.track {
  display: flex;
  width: max-content;
  animation: slide 90s linear infinite;
}

.seq {
  flex: none;
  padding-right: 12px;
  font-size: clamp(22px, 3.2vw, 42px);
  font-weight: 500;
  letter-spacing: -0.03em;
  color: rgba(0, 0, 0, 0.07);
  white-space: nowrap;
}

@keyframes slide {
  to {
    transform: translateX(-50%);
  }
}

/* ================= CATALOG ================= */
.catalog {
  max-width: 1200px;
  margin: 0 auto;
  padding: 84px 32px 0;
}

.cat-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 34px;
}

/* 搜索：下划线极简输入 */
.search {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  width: 250px;
  padding: 9px 2px;
  border-bottom: 1px solid var(--border-2);
  color: var(--text-3);
  transition: border-color 0.25s;
}

.search:focus-within {
  border-color: var(--text-1);
  color: var(--text-1);
}

.search input {
  flex: 1;
  min-width: 0;
  border: none;
  background: none;
  outline: none;
  font-family: inherit;
  font-size: 13px;
  letter-spacing: -0.01em;
  color: var(--text-1);
}

.search input::placeholder {
  color: var(--text-3);
}

.search .clear {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: var(--fill-1);
  color: var(--text-2);
  cursor: pointer;
}

.search .clear:hover {
  background: #e8e8ed;
  color: var(--text-1);
}

.cat-title {
  margin: 12px 0 0;
  font-size: clamp(30px, 4vw, 44px);
  font-weight: 600;
  letter-spacing: -0.04em;
  color: var(--text-1);
}

.filters {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid rgba(0, 0, 0, 0.07);
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(14px);
  margin-bottom: 34px;
}

.cats {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.cats button {
  height: 34px;
  padding: 0 14px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--text-2);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.25s, color 0.25s, box-shadow 0.25s;
}

.cats button:hover {
  color: var(--text-1);
  background: rgba(255, 255, 255, 0.05);
}

.cats button.on {
  background: #1d1d1f;
  color: #fff;
}

.cats .n {
  margin-left: 6px;
  font-size: 10.5px;
  opacity: 0.55;
}

.sorts {
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: 999px;
  background: #f5f5f7;
}

.sorts button {
  height: 28px;
  padding: 0 12px;
  border: none;
  border-radius: 999px;
  background: none;
  color: #86868b;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: color 0.2s, background-color 0.2s;
}

.sorts button:hover {
  color: var(--text-1);
}

.sorts button.on {
  background: #fff;
  color: var(--text-1);
  box-shadow: var(--shadow-pill);
}

/* ---------- 网格 ---------- */
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 22px;
}

.card {
  display: block;
  min-width: 0;
  text-decoration: none;
  border-radius: 24px;
}

.card-inner {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  border-radius: 24px;
  padding: 10px 10px 18px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  background: #fff;
  transition: transform 0.5s var(--ease-out), border-color 0.4s, box-shadow 0.4s;
  transform-style: preserve-3d;
  will-change: transform;
}

.card:hover .card-inner {
  border-color: rgba(0, 0, 0, 0.1);
  box-shadow: 0 30px 60px -30px rgba(0, 0, 0, 0.3);
}

/* 鼠标光斑（浅色：淡灰） */
.spot {
  position: absolute;
  inset: 0;
  border-radius: 24px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.4s;
  background: radial-gradient(
    260px circle at var(--mx, 50%) var(--my, 0%),
    rgba(0, 0, 0, 0.04),
    transparent 64%
  );
}

.card:hover .spot {
  opacity: 1;
}

.visual {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 4 / 3.4;
  border-radius: 17px;
  overflow: hidden;
  isolation: isolate;
}

/* 悬停时一道高光斜扫过图面 */

.shape {
  display: block;
  background-image: linear-gradient(155deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.28));
  box-shadow: 0 30px 52px -22px rgba(0, 0, 0, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.6);
  transition: transform 0.7s var(--ease-out);
}

.photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transform: scale(1.04);
  transition: opacity 0.8s ease, transform 1s var(--ease-out);
}

.photo.loaded {
  opacity: 1;
  transform: scale(1);
}

.card:hover .photo {
  transform: scale(1.06);
}

/* 滚动驱动图片视差：图片随卡片在视口中的位置上下平移（零 JS，渐进增强） */
@keyframes card-par {
  from {
    transform: scale(1.12) translateY(-4.5%);
  }
  to {
    transform: scale(1.12) translateY(4.5%);
  }
}

@supports (animation-timeline: view()) {
  .photo.loaded {
    animation: card-par linear both;
    animation-timeline: view();
    animation-range: entry 10% cover 45%;
  }
  @media (prefers-reduced-motion: reduce) {
    .photo.loaded {
      animation: none;
    }
  }
}

.s0 .shape {
  width: 40%;
  aspect-ratio: 1;
  border-radius: 50%;
}
.s1 .shape {
  width: 19%;
  aspect-ratio: 1 / 2;
  border-radius: 999px;
}
.s2 .shape {
  width: 34%;
  aspect-ratio: 1;
  border-radius: 26%;
}
.s3 .shape {
  width: 36%;
  aspect-ratio: 1;
  border-radius: 50% 50% 12% 12%;
}

.tone-graphite {
  background: linear-gradient(148deg, #4a4a4d 0%, #1d1d1f 72%);
}
.tone-graphite .shape {
  background-image: linear-gradient(155deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.04));
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

.tag {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 3;
  padding: 5px 11px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(10px);
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--text-1);
}

/* 快速加购：悬停浮现，触屏常显 */
.quick {
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 3;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  color: var(--text-1);
  cursor: pointer;
  opacity: 0;
  transform: translateY(8px);
  box-shadow: 0 10px 24px -12px rgba(0, 0, 0, 0.45);
  transition: opacity 0.3s, transform 0.4s var(--ease-out), background-color 0.2s;
}

.card:hover .quick {
  opacity: 1;
  transform: none;
}

.quick:hover {
  background: var(--text-1);
  color: #fff;
  transform: scale(1.08);
}

.quick:active {
  transform: scale(0.92);
}

@media (hover: none) {
  .quick {
    opacity: 1;
    transform: none;
  }
}

.meta {
  min-width: 0;
  padding: 15px 8px 0;
  transform: translateZ(18px);
}

.meta-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.meta h3 {
  min-width: 0;
  margin: 0;
  font-size: 14.5px;
  font-weight: 500;
  letter-spacing: -0.02em;
  color: var(--text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  /* Aesop/COS 式：hover 时名字下划线从左滑出 */
  background: linear-gradient(currentColor, currentColor) no-repeat left bottom / 0 1px;
  transition: background-size 0.45s var(--ease-out);
  padding-bottom: 2px;
}

.card:hover .meta h3 {
  background-size: 100% 1px;
}

.arrow {
  flex: none;
  color: var(--text-3);
  opacity: 0;
  transform: translate(-3px, 3px);
  transition: opacity 0.3s, transform 0.35s var(--ease-out), color 0.3s;
}

.card:hover .arrow {
  opacity: 1;
  transform: none;
  color: var(--text-1);
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 12px;
}

.price {
  font-size: 15.5px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--text-1);
  font-variant-numeric: tabular-nums;
}

.was {
  font-size: 11.5px;
  color: #b0b0b6;
  font-variant-numeric: tabular-nums;
}

.skeleton {
  aspect-ratio: 4 / 3.4;
  border-radius: 24px;
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

.empty {
  padding: 80px 0;
  text-align: center;
  font-size: 13.5px;
  color: var(--text-3);
}

/* ================= OUTRO ================= */
.outro {
  max-width: 1200px;
  margin: 120px auto 0;
  padding: 0 32px;
  text-align: center;
}

.outro-title {
  margin: 20px 0 0;
  font-size: clamp(34px, 5.4vw, 64px);
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.045em;
  color: var(--text-1);
}

.outro-btn {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  height: 50px;
  margin-top: 34px;
  padding: 0 28px;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.14);
  background: #fff;
  color: var(--text-1);
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.3s, box-shadow 0.3s, transform 0.5s var(--ease-out);
}

.outro-btn:hover {
  border-color: rgba(0, 0, 0, 0.5);
  box-shadow: 0 14px 30px -18px rgba(0, 0, 0, 0.4);
}

/* ================= 响应式 ================= */
@media (max-width: 1080px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 860px) {
  .hero {
    min-height: 82vh;
    padding: 24px 20px 96px;
  }
  .stats {
    gap: 18px;
    padding: 14px 20px;
  }
  .catalog {
    padding: 60px 20px 0;
  }
  .cat-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  .sorts {
    display: none;
  }
  .grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 14px;
  }
  .card-inner {
    padding: 8px 8px 14px;
    border-radius: 20px;
  }
  .outro {
    margin-top: 84px;
    padding: 0 20px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .track {
    animation: none;
  }
  .bead {
    animation: none;
  }
}
</style>
