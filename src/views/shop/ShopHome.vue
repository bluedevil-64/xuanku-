<script setup>
import { computed, inject, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { shopApi } from '../../api'
import { demoProducts, demoCategories } from '../../api/demo'
import WavesBg from '../../components/WavesBg.vue'

const route = useRoute()
const router = useRouter()
const openChat = inject('openChat', () => {})

const products = ref([])
const cats = ref([])
const category = ref(route.query.c || '')
const sort = ref('default')
const loading = ref(true)

/** 滚动进度：只用来做 hero 视差与导航态，不驱动布局 */
const scrollY = ref(0)
let raf = 0

/** 逐字标题：第一行拆成单字错峰入场；第二行是渐变文字，只能整行动画 */
const TITLE_L1 = '把好设计'

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
  { key: 'default', label: '综合' },
  { key: 'new', label: '最新' },
  { key: 'price_asc', label: '价格 ↑' },
  { key: 'price_desc', label: '价格 ↓' },
]

const totalCount = computed(() => cats.value.reduce((n, c) => n + Number(c.count || 0), 0))

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

/** 图片解码完成后再淡入，避免黑块闪一下 */
const loaded = reactive(new Set())
function onImgLoad(id) {
  loaded.add(id)
}

/** 磁吸：光标在按钮内时轻微跟随，离开回弹 */
function magnetMove(e) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  const x = ((e.clientX - r.left - r.width / 2) * 0.14).toFixed(1)
  const y = ((e.clientY - r.top - r.height / 2) * 0.22).toFixed(1)
  el.style.transition = 'none'
  el.style.transform = `translate(${x}px, ${y}px)`
}

function magnetLeave(e) {
  const el = e.currentTarget
  el.style.transition = ''
  el.style.transform = ''
}

/** 首屏聚光：一道极淡的暗晕跟随鼠标，像纸面被手电压住 */
const heroEl = ref(null)

function heroSpot(e) {
  const el = heroEl.value
  if (!el) return
  const r = el.getBoundingClientRect()
  el.style.setProperty('--hx', `${e.clientX - r.left}px`)
  el.style.setProperty('--hy', `${e.clientY - r.top}px`)
}

/** 卡片光斑 + 轻微 3D 倾斜（作用在内层，避免与 reveal 的 transform 打架） */
function cardMove(e) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  const px = e.clientX - r.left
  const py = e.clientY - r.top
  el.style.setProperty('--mx', `${px}px`)
  el.style.setProperty('--my', `${py}px`)
  if (window.matchMedia('(pointer: coarse)').matches) return
  const rx = ((py / r.height - 0.5) * -3.4).toFixed(2)
  const ry = ((px / r.width - 0.5) * 3.4).toFixed(2)
  el.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`
}

function cardLeave(e) {
  const el = e.currentTarget
  el.style.transform = ''
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
    <section ref="heroEl" class="hero" @mousemove="heroSpot">
      <WavesBg class="hero-waves" />
      <div class="hero-glow" aria-hidden="true"></div>
      <div class="hero-spot" aria-hidden="true"></div>

      <div class="hero-inner" :style="heroStyle">
        <p class="eyebrow hero-in" v-scramble>Selected Objects · 2026</p>

        <h1 class="title">
          <span class="line">
            <span
              v-for="(ch, i) in TITLE_L1"
              :key="`a${i}`"
              class="ch"
              :style="{ '--d': `${0.12 + i * 0.055}s` }"
              >{{ ch }}</span
            >
          </span>
          <span class="line grad-text ch-line" :style="{ '--d': '0.4s' }">带回家里</span>
        </h1>

        <p class="lede hero-in">
          十二件被反复挑选的物件，参数和场景都写清楚了。<br />
          挑不准，右下角的窗口替你拿主意。
        </p>

        <div class="cta hero-in">
          <a
            class="primary magnet"
            href="#catalog"
            @mousemove="magnetMove"
            @mouseleave="magnetLeave"
          >
            <span class="ring" aria-hidden="true">
              <span class="beam"></span>
              <span class="beam b2"></span>
            </span>
            <span class="core">
              <span class="label">开始选购</span>
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h13M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </span>
          </a>
          <button class="ghost" @click="openChat">
            <span class="spark"></span>
            问问 AI 导购
          </button>
        </div>

        <dl class="stats hero-in">
          <div>
            <dt>{{ shown.products }}</dt>
            <dd>件在售</dd>
          </div>
          <span class="rule"></span>
          <div>
            <dt>{{ shown.cats }}</dt>
            <dd>个品类</dd>
          </div>
          <span class="rule"></span>
          <div>
            <dt>{{ shown.hours }}h</dt>
            <dd>顺丰发出</dd>
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
          New Arrivals · 精选好物 · Good Design · 静谧生活 · Selected Objects ·
        </span>
      </div>
    </div>

    <!-- ============ 商品目录 ============ -->
    <section id="catalog" class="catalog">
      <header class="cat-head">
        <div>
          <p class="eyebrow">Catalog</p>
          <h2 class="cat-title">全部物件</h2>
        </div>
        <p class="cat-note">
          <span class="num">{{ totalCount || products.length }}</span> 件商品 · 数据来自本地快照
        </p>
      </header>

      <div class="filters">
        <div class="cats">
          <button :class="{ on: !category }" @click="setCat('')">全部</button>
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
          v-for="(p, i) in products"
          :key="p.id"
          :to="`/shop/p/${p.id}`"
          class="card"
          v-reveal="{ delay: (i % 4) * 70 }"
        >
          <div class="card-inner" @mousemove="cardMove" @mouseleave="cardLeave">
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
              <span class="sheen" aria-hidden="true"></span>
            </div>

            <div class="meta">
              <div class="meta-top">
                <h3>{{ p.name }}</h3>
                <span class="arrow">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M7 17L17 7M9 7h8v8" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </span>
              </div>
              <p class="sub">{{ p.subtitle }}</p>
              <div class="price-row">
                <span class="price">¥{{ money(p.price) }}</span>
                <s v-if="p.originalPrice" class="was">¥{{ money(p.originalPrice) }}</s>
                <span class="cat-dot">{{ p.category }}</span>
              </div>
            </div>

            <span class="spot" aria-hidden="true"></span>
          </div>
        </router-link>
      </div>

      <p v-if="!loading && !products.length" class="empty">这个分类下还没有商品，换一个看看</p>
    </section>

    <!-- ============ 尾部 CTA ============ -->
    <section class="outro">
      <p class="eyebrow" v-scramble>还没想好？</p>
      <h2 class="outro-title">
        让 AI 替你<br />
        <span class="grad-text">挑一件对的</span>
      </h2>
      <button class="outro-btn magnet" @mousemove="magnetMove" @mouseleave="magnetLeave" @click="openChat">
        和导购聊两句
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

.hero-glow {
  position: absolute;
  top: 8%;
  left: 50%;
  width: min(900px, 88vw);
  height: min(900px, 88vw);
  transform: translateX(-50%);
  background: radial-gradient(circle, rgba(124, 108, 255, 0.09), transparent 62%);
  filter: blur(30px);
  pointer-events: none;
}

/* 鼠标聚光：极淡暗晕跟随，白纸被轻轻压出一块阴影 */
.hero-spot {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.6s;
  background: radial-gradient(
    420px circle at var(--hx, 50%) var(--hy, 40%),
    rgba(0, 0, 0, 0.045),
    transparent 70%
  );
}

.hero:hover .hero-spot {
  opacity: 1;
}

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
  font-size: clamp(46px, 8.6vw, 118px);
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

/* 逐字入场：blur + 上浮 + 轻微旋转，按 --d 错峰 */
.title .ch {
  display: inline-block;
  animation: hero-char 0.95s var(--ease-out) both;
  animation-delay: var(--d, 0s);
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

.lede {
  max-width: 560px;
  margin: 30px auto 0;
  font-size: 15.5px;
  line-height: 1.85;
  color: var(--text-2);
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
  position: relative;
  display: inline-flex;
  height: 50px;
  padding: 2px;
  border-radius: 999px;
  background: #1d1d1f;
  text-decoration: none;
  transition: transform 0.5s var(--ease-out);
}

/* StarBorder：光点只在边缘 2px 环上绕行，中心被 .core 盖住 */
.primary .ring {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  overflow: hidden;
  pointer-events: none;
}

.primary .beam {
  position: absolute;
  inset: -150%;
  background: conic-gradient(
    from 0deg,
    transparent 0deg 332deg,
    rgba(255, 255, 255, 0.95) 352deg,
    transparent 360deg
  );
  animation: beam-spin 4.2s linear infinite;
}

.primary .beam.b2 {
  background: conic-gradient(
    from 180deg,
    transparent 0deg 344deg,
    rgba(255, 255, 255, 0.5) 356deg,
    transparent 360deg
  );
  animation-duration: 6.6s;
  animation-direction: reverse;
}

.primary .core {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  height: 100%;
  padding: 0 26px;
  border-radius: 999px;
  background: #1d1d1f;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.primary:hover .core {
  background: #000;
}

@keyframes beam-spin {
  to {
    transform: rotate(1turn);
  }
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
  animation: slide 42s linear infinite;
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

.cat-title {
  margin: 12px 0 0;
  font-size: clamp(30px, 4vw, 44px);
  font-weight: 600;
  letter-spacing: -0.04em;
  color: var(--text-1);
}

.cat-note {
  margin: 0 0 6px;
  font-size: 12.5px;
  color: var(--text-3);
}

.cat-note .num {
  color: var(--text-1);
  font-variant-numeric: tabular-nums;
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
.sheen {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background: linear-gradient(
    112deg,
    transparent 32%,
    rgba(255, 255, 255, 0.4) 46%,
    rgba(255, 255, 255, 0.1) 54%,
    transparent 66%
  );
  transform: translateX(-120%);
  transition: transform 0.85s var(--ease-out);
}

.card:hover .sheen {
  transform: translateX(120%);
}

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

.sub {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.cat-dot {
  margin-left: auto;
  font-size: 10.5px;
  letter-spacing: 0.06em;
  color: #b6b6be;
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
  margin: 18px 0 0;
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
  .lede {
    font-size: 14.5px;
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
  .sheen {
    display: none;
  }
}
</style>
