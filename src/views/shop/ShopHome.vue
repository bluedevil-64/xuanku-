<script setup>
import { inject, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { shopApi } from '../../api'
import { demoProducts, demoCategories } from '../../api/demo'

const route = useRoute()
const router = useRouter()
const openChat = inject('openChat', () => {})

const products = ref([])
const cats = ref([])
const category = ref(route.query.c || '')
const sort = ref('default')
const loading = ref(true)

const SORTS = [
  { key: 'default', label: '综合' },
  { key: 'new', label: '最新' },
  { key: 'price_asc', label: '价格由低到高' },
  { key: 'price_desc', label: '价格由高到低' },
]

async function load() {
  loading.value = true
  try {
    const page = await shopApi.products(
      {
        category: category.value || undefined,
        sort: sort.value,
        size: 24,
      },
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
    .then((list) => (cats.value = list))
    .catch(() => demoCategories().then((list) => (cats.value = list)))})

function money(v) {
  return Number(v ?? 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

/** 图片解码完成后再淡入，避免白块闪一下 */
const loaded = reactive(new Set())
function onImgLoad(id) {
  loaded.add(id)
}

/** 磁吸：光标在按钮内时轻微跟随，离开回弹 */
function magnetMove(e) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  const x = ((e.clientX - r.left - r.width / 2) * 0.16).toFixed(1)
  const y = ((e.clientY - r.top - r.height / 2) * 0.24).toFixed(1)
  el.style.transition = 'none'
  el.style.transform = `translate(${x}px, ${y}px)`
}

function magnetLeave(e) {
  const el = e.currentTarget
  el.style.transition = ''
  el.style.transform = ''
}

/** 用 id 各位数字之和决定抽象图形，避免相邻 id 形状重复 */
function shapeOf(id) {
  return String(id)
    .split('')
    .reduce((n, c) => n + Number(c), 0) % 4
}
</script>

<template>
  <div class="home">
    <section class="hero">
      <p class="eyebrow hero-in">AI 导购 · 精选好物</p>
      <h1 class="hero-in">把好设计<br />带回家里</h1>
      <p class="lede hero-in">
        从耳机到沙发，每件都写清了参数与适用场景。<br />
        拿不定主意，随时问 AI 客服。
      </p>
      <div class="cta hero-in">
        <a class="primary magnet" href="#catalog" @mousemove="magnetMove" @mouseleave="magnetLeave">
          开始选购
        </a>
        <button class="ghost" @click="openChat">问问 AI 客服 →</button>
      </div>
    </section>

    <section id="catalog" class="catalog">
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
          v-reveal="{ delay: (i % 4) * 60 }"
        >
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
          </div>
          <div class="meta">
            <h3>{{ p.name }}</h3>
            <p class="sub">{{ p.subtitle }}</p>
            <div class="price-row">
              <span class="price">¥{{ money(p.price) }}</span>
              <s v-if="p.originalPrice" class="was">¥{{ money(p.originalPrice) }}</s>
            </div>
          </div>
        </router-link>
      </div>

      <p v-if="!loading && !products.length" class="empty">没有找到相关商品，换个分类看看</p>
    </section>
  </div>
</template>

<style scoped>
.hero {
  max-width: 1240px;
  margin: 0 auto;
  padding: 92px 40px 68px;
  text-align: center;
}

/* 逐行错峰入场 */
.hero .eyebrow {
  animation-delay: 0.06s;
}
.hero h1 {
  animation-delay: 0.14s;
}
.hero .lede {
  animation-delay: 0.26s;
}
.hero .cta {
  animation-delay: 0.36s;
}

.eyebrow {
  margin: 0 0 24px;
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: 0.14em;
  color: #86868b;
}

.hero h1 {
  margin: 0;
  font-size: 62px;
  line-height: 1.05;
  font-weight: 600;
  letter-spacing: -2.6px;
  color: #1d1d1f;
}

.lede {
  max-width: 520px;
  margin: 28px auto 0;
  font-size: 17px;
  line-height: 1.65;
  color: #6e6e73;
}

.cta {
  margin-top: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 22px;
}

.primary {
  padding: 13px 30px;
  border-radius: 999px;
  background: #1d1d1f;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: background-color 0.2s, transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}

.primary:hover {
  background: #000;
}

.ghost {
  border: none;
  background: none;
  padding: 0;
  font-size: 14px;
  font-family: inherit;
  color: #1d1d1f;
  cursor: pointer;
  transition: opacity 0.2s;
}

.ghost:hover {
  opacity: 0.6;
}

.catalog {
  max-width: 1240px;
  margin: 0 auto;
  padding: 0 40px 72px;
}

.filters {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
  padding: 22px 0 26px;
  border-top: 0.5px solid rgba(0, 0, 0, 0.08);
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
  color: #6e6e73;
  font-size: 13.5px;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s;
}

.cats button:hover {
  color: #1d1d1f;
}

.cats button.on {
  background: #1d1d1f;
  color: #fff;
}

.cats .n {
  margin-left: 6px;
  font-size: 11px;
  opacity: 0.5;
}

.sorts {
  display: flex;
  gap: 2px;
}

.sorts button {
  padding: 6px 10px;
  border: none;
  background: none;
  color: #86868b;
  font-size: 12.5px;
  font-family: inherit;
  cursor: pointer;
  transition: color 0.2s;
}

.sorts button:hover {
  color: #1d1d1f;
}

.sorts button.on {
  color: #1d1d1f;
  font-weight: 500;
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 32px 20px;
}

.card {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  transition: transform 0.5s cubic-bezier(0.32, 0.72, 0, 1);
}

.card:hover {
  transform: translateY(-4px);
}

.card:hover .visual {
  box-shadow: 0 20px 44px -26px rgba(0, 0, 0, 0.42);
}

.visual {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 4 / 3;
  border-radius: 20px;
  overflow: hidden;
  transition: box-shadow 0.4s;
}

/* 抽象产品图：渐变底 + 几何形体（无图片时的兜底） */
.shape {
  display: block;
  background-image: linear-gradient(155deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.28));
  box-shadow: 0 30px 52px -22px rgba(0, 0, 0, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.6);
  transition: transform 0.6s cubic-bezier(0.32, 0.72, 0, 1);
}

/* 实拍商品图 */
.photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.7s ease, transform 0.7s cubic-bezier(0.32, 0.72, 0, 1);
}

.photo.loaded {
  opacity: 1;
}

.card:hover .photo {
  transform: scale(1.05);
}

.s0 .shape {
  width: 42%;
  aspect-ratio: 1;
  border-radius: 50%;
}

.s1 .shape {
  width: 20%;
  aspect-ratio: 1 / 2;
  border-radius: 999px;
}

.s2 .shape {
  width: 36%;
  aspect-ratio: 1;
  border-radius: 26%;
}

.s3 .shape {
  width: 38%;
  aspect-ratio: 1;
  border-radius: 50% 50% 12% 12%;
}

.tone-graphite {
  background: linear-gradient(148deg, #4a4a4d 0%, #1d1d1f 72%);
}
.tone-graphite .shape {
  background-image: linear-gradient(155deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.04));
  box-shadow: 0 30px 52px -22px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.25);
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
  top: 14px;
  left: 14px;
  padding: 4px 11px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(10px);
  font-size: 11px;
  font-weight: 500;
  color: #1d1d1f;
}

.meta {
  padding: 15px 2px 0;
}

.meta h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: -0.2px;
  color: #1d1d1f;
}

.sub {
  margin: 5px 0 0;
  min-height: 19px;
  font-size: 12.5px;
  line-height: 1.5;
  color: #86868b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 10px;
}

.price {
  font-size: 15px;
  font-weight: 600;
  color: #1d1d1f;
}

.was {
  font-size: 12.5px;
  color: #b0b0b6;
}

.skeleton {
  aspect-ratio: 4 / 3;
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

.empty {
  padding: 64px 0;
  text-align: center;
  font-size: 14px;
  color: #a1a1a6;
}

@media (max-width: 1000px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 760px) {
  .hero {
    padding: 80px 20px 64px;
  }
  .hero h1 {
    font-size: 40px;
    letter-spacing: -1.4px;
  }
  .lede {
    font-size: 15px;
  }
  .catalog {
    padding: 0 20px 48px;
  }
  .grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 24px 14px;
  }
  .sorts {
    display: none;
  }
}
</style>
