<script setup>
import { computed, inject, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { shopApi } from '../../api'
import { demoProduct, demoProducts } from '../../api/demo'
import { useCartStore } from '../../stores/cart'

const route = useRoute()
const router = useRouter()
const cart = useCartStore()
const openChat = inject('openChat', () => {})

const product = ref(null)
const qty = ref(1)
const loading = ref(true)
const related = ref([])

/** 相关推荐：同分类优先，不足 3 件用其他分类热销补齐 */
async function loadRelated(current) {
  let list = []
  try {
    const page = await shopApi.products({ size: 60 }, true)
    list = page.records || []
  } catch {
    const page = await demoProducts({ size: 60 })
    list = page.records || []
  }
  const others = list.filter((x) => String(x.id) !== String(current.id))
  related.value = [
    ...others.filter((x) => x.category === current.category),
    ...others.filter((x) => x.category !== current.category),
  ].slice(0, 3)
}

const specList = computed(() =>
  (product.value?.specs || '')
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      const i = line.indexOf('=')
      return i < 0
        ? { k: line.trim(), v: '' }
        : { k: line.slice(0, i).trim(), v: line.slice(i + 1).trim() }
    }),
)

async function load() {
  loading.value = true
  try {
    product.value = await shopApi.product(route.params.id, true)
  } catch {
    // 接口不可用（纯静态部署）时退回打包快照，详情页仍可查看
    product.value = await demoProduct(route.params.id)
  } finally {
    qty.value = 1
    loading.value = false
    if (product.value) loadRelated(product.value)
  }
}

watch(() => route.params.id, load)
onMounted(load)

function money(v) {
  return Number(v ?? 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

/** 与列表页一致的抽象图形算法 */
function shapeOf(id) {
  return String(id)
    .split('')
    .reduce((n, c) => n + Number(c), 0) % 4
}

function addToCart() {
  if (!product.value) return
  cart.add(product.value, qty.value)
  ElMessage.success(`Added to cart · ${product.value.name} × ${qty.value}`)
}

function buyNow() {
  if (!product.value) return
  cart.add(product.value, qty.value)
  router.push('/shop/cart')
}

/** 磁吸 */
function magnetMove(e) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  const x = ((e.clientX - r.left - r.width / 2) * 0.12).toFixed(1)
  const y = ((e.clientY - r.top - r.height / 2) * 0.2).toFixed(1)
  el.style.transition = 'none'
  el.style.transform = `translate(${x}px, ${y}px)`
}

function magnetLeave(e) {
  const el = e.currentTarget
  el.style.transition = ''
  el.style.transform = ''
}
</script>

<template>
  <div class="page">
    <router-link to="/shop" class="back">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M19 12H6M12 19l-7-7 7-7" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      All objects
    </router-link>

    <div v-if="loading" class="skeleton"></div>

    <div v-else-if="!product" class="missing">
      <p>This item is gone</p>
      <router-link to="/shop">Browse other objects →</router-link>
    </div>

    <div v-else class="layout">
      <!-- 图 -->
      <div class="stage">
        <div class="gallery" :class="[`tone-${product.tone}`, `s${shapeOf(product.id)}`]">
          <img v-if="product.image" :src="product.image" :alt="product.name" class="photo" />
          <span v-else class="shape"></span>
          <span v-if="product.tag" class="tag">{{ product.tag }}</span>
          <span class="gloss" aria-hidden="true"></span>
        </div>
        <ul class="promise">
          <li><span class="dot"></span>Ships in 24h via SF Express</li>
          <li><span class="dot"></span>7-day returns</li>
          <li><span class="dot"></span>1-year warranty</li>
        </ul>
      </div>

      <!-- 信息 -->
      <div class="info">
        <p class="eyebrow">{{ product.category }}</p>
        <h1 class="name">{{ product.name }}</h1>
        <p class="sub">{{ product.subtitle }}</p>

        <div class="rating">
          <span class="star">★</span>
          <strong>{{ product.rating }}</strong>
          <span class="sep"></span>
          <span>{{ product.sales }} sold</span>
          <span class="sep"></span>
          <span>{{ product.stock }} in stock</span>
        </div>

        <div class="price">
          <span class="now">¥{{ money(product.price) }}</span>
          <s v-if="product.originalPrice" class="was">¥{{ money(product.originalPrice) }}</s>
          <span v-if="product.originalPrice" class="save">
            Save ¥{{ money(product.originalPrice - product.price) }}
          </span>
        </div>

        <p class="desc">{{ product.description }}</p>

        <div class="buy">
          <div class="qty">
            <button :disabled="qty <= 1" @click="qty = Math.max(1, qty - 1)">−</button>
            <span>{{ qty }}</span>
            <button
              :disabled="qty >= product.stock"
              @click="qty = Math.min(product.stock, qty + 1)"
            >
              +
            </button>
          </div>
          <button class="add magnet" @mousemove="magnetMove" @mouseleave="magnetLeave" @click="addToCart">
            Add to cart
          </button>
          <button class="now-buy" @click="buyNow">Buy now</button>
        </div>

        <button class="ask" @click="openChat">
          <span class="spark"></span>
          Ask the concierge: is this right for me?
        </button>

        <dl class="specs">
          <template v-for="s in specList" :key="s.k">
            <dt>{{ s.k }}</dt>
            <dd>{{ s.v }}</dd>
          </template>
        </dl>

        <div v-if="related.length" class="related">
          <p class="eyebrow">Keep looking</p>
          <div class="rel-grid">
            <router-link v-for="r in related" :key="r.id" :to="`/shop/p/${r.id}`" class="rel-card">
              <span class="rel-visual" :class="[`tone-${r.tone}`, `s${shapeOf(r.id)}`]">
                <img v-if="r.image" :src="r.image" :alt="r.name" loading="lazy" />
                <span v-else class="shape"></span>
              </span>
              <span class="rel-name">{{ r.name }}</span>
              <span class="rel-price">¥{{ money(r.price) }}</span>
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 32px 40px;
}

.back {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  color: var(--text-3);
  text-decoration: none;
  transition: color 0.2s;
}

.back:hover {
  color: var(--text-1);
}

.layout {
  display: grid;
  grid-template-columns: 1.02fr 1fr;
  gap: 68px;
  margin-top: 26px;
  align-items: start;
  animation: page-in 0.6s var(--ease-out) both;
}

/* ---------- 图 ---------- */
.stage {
  position: sticky;
  top: 92px;
}

.gallery {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1 / 1;
  border-radius: 28px;
  overflow: hidden;
  isolation: isolate;
  border: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 40px 80px -40px rgba(0, 0, 0, 0.35);
}

.photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 1.4s var(--ease-out);
}

.gallery:hover .photo {
  transform: scale(1.045);
}

.gloss {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background: radial-gradient(120% 90% at 20% 0%, rgba(255, 255, 255, 0.5), transparent 55%);
  mix-blend-mode: soft-light;
}

.shape {
  display: block;
  background-image: linear-gradient(155deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.28));
  box-shadow: 0 46px 80px -32px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.6);
  animation: float 7s ease-in-out infinite;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.s0 .shape {
  width: 46%;
  aspect-ratio: 1;
  border-radius: 50%;
}
.s1 .shape {
  width: 22%;
  aspect-ratio: 1 / 2;
  border-radius: 999px;
}
.s2 .shape {
  width: 40%;
  aspect-ratio: 1;
  border-radius: 26%;
}
.s3 .shape {
  width: 42%;
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
  top: 18px;
  left: 18px;
  z-index: 3;
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(0, 0, 0, 0.16);
  backdrop-filter: blur(14px);
  font-size: 11px;
  font-weight: 500;
  color: var(--text-1);
}

.promise {
  display: flex;
  gap: 20px;
  margin: 18px 0 0;
  padding: 0 4px;
  list-style: none;
  flex-wrap: wrap;
}

.promise li {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 11.5px;
  color: var(--text-3);
}

.promise .dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #34c759;
  box-shadow: 0 0 0 3px rgba(52, 199, 89, 0.14);
}

/* ---------- 信息 ---------- */
.info {
  padding-top: 8px;
}

.info .eyebrow {
  margin: 0 0 16px;
}

.name {
  margin: 0;
  font-size: clamp(28px, 3.1vw, 40px);
  line-height: 1.1;
  font-weight: 600;
  letter-spacing: -0.045em;
  color: var(--text-1);
  text-wrap: balance;
}

.sub {
  margin: 14px 0 0;
  font-size: 15px;
  line-height: 1.7;
  color: var(--text-2);
}

.rating {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 20px;
  font-size: 12px;
  color: var(--text-3);
}

.rating strong {
  font-weight: 600;
  color: var(--text-1);
  font-variant-numeric: tabular-nums;
}

.star {
  color: var(--text-1);
  font-size: 12px;
}

.sep {
  width: 1px;
  height: 10px;
  background: rgba(0, 0, 0, 0.12);
}

.price {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-top: 26px;
  padding-bottom: 26px;
  border-bottom: 0.5px solid var(--hairline);
}

.now {
  font-size: 34px;
  font-weight: 600;
  letter-spacing: -0.04em;
  color: var(--text-1);
  font-variant-numeric: tabular-nums;
}

.was {
  font-size: 14px;
  color: #4f4f5b;
  font-variant-numeric: tabular-nums;
}

.save {
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--brand-soft);
  color: var(--text-1);
  font-size: 11px;
  letter-spacing: 0.02em;
}

.desc {
  margin: 24px 0 0;
  font-size: 14px;
  line-height: 1.85;
  color: var(--text-2);
}

.buy {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 30px;
  flex-wrap: wrap;
}

.qty {
  display: inline-flex;
  align-items: center;
  height: 50px;
  padding: 0 5px;
  border-radius: 999px;
  border: 1px solid var(--border-1);
  background: #f5f5f7;
}

.qty button {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-1);
  font-size: 16px;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.2s;
}

.qty button:hover:not(:disabled) {
  background: #e8e8ed;
}

.qty button:disabled {
  color: #c7c7cc;
  cursor: default;
}

.qty span {
  min-width: 28px;
  text-align: center;
  font-size: 14px;
  color: var(--text-1);
  font-variant-numeric: tabular-nums;
}

.add,
.now-buy {
  height: 50px;
  padding: 0 26px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.25s, transform 0.5s var(--ease-out), box-shadow 0.3s,
    border-color 0.25s;
}

.add {
  border: none;
  background: #1d1d1f;
  color: #fff;
  box-shadow: none;
}

.add:hover {
  box-shadow: 0 20px 44px -26px rgba(0, 0, 0, 0.42);
}

.now-buy {
  border: 1px solid rgba(0, 0, 0, 0.16);
  background: #fff;
  color: var(--text-1);
}

.now-buy:hover {
  border-color: var(--text-1);
  background: #fff;
}

.ask {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  margin-top: 16px;
  padding: 10px 16px;
  border-radius: 999px;
  border: 1px dashed rgba(0, 0, 0, 0.14);
  background: #fafafa;
  color: var(--text-2);
  font-size: 12.5px;
  font-family: inherit;
  cursor: pointer;
  transition: color 0.25s, border-color 0.25s, background-color 0.25s;
}

.ask:hover {
  color: var(--text-1);
  border-color: rgba(0, 0, 0, 0.36);
  background: #fff;
}

.spark {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #34c759;
  box-shadow: 0 0 0 3px rgba(52, 199, 89, 0.16);
}

.specs {
  display: grid;
  grid-template-columns: 108px 1fr;
  margin: 44px 0 0;
  border-top: 0.5px solid var(--hairline);
}

.specs dt,
.specs dd {
  margin: 0;
  padding: 14px 0;
  border-bottom: 0.5px solid var(--hairline);
  font-size: 13px;
  line-height: 1.5;
}

.specs dt {
  color: var(--text-3);
}

.specs dd {
  color: var(--text-1);
}

/* ---------- 相关推荐 ---------- */
.related {
  margin-top: 52px;
}

.related .eyebrow {
  margin: 0 0 18px;
}

.rel-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.rel-card {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  background: #fff;
  padding: 8px 8px 14px;
  transition: transform 0.4s var(--ease-out), box-shadow 0.4s, border-color 0.3s;
}

.rel-card:hover {
  transform: translateY(-4px);
  border-color: rgba(0, 0, 0, 0.1);
  box-shadow: 0 22px 44px -26px rgba(0, 0, 0, 0.35);
}

.rel-visual {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 4 / 3;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 12px;
}

.rel-visual img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.8s var(--ease-out);
}

.rel-card:hover .rel-visual img {
  transform: scale(1.05);
}

.rel-visual .shape {
  display: block;
  background-image: linear-gradient(155deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.28));
  box-shadow: 0 20px 36px -18px rgba(0, 0, 0, 0.3);
  animation: float 7s ease-in-out infinite;
}

.rel-name {
  padding: 0 6px;
  font-size: 12.5px;
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rel-price {
  padding: 5px 6px 0;
  font-size: 12px;
  color: var(--text-2);
  font-variant-numeric: tabular-nums;
}

.skeleton {
  margin-top: 26px;
  height: 560px;
  border-radius: 28px;
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

.missing {
  padding: 140px 0;
  text-align: center;
}

.missing p {
  margin: 0 0 16px;
  font-size: 16px;
  color: var(--text-2);
}

.missing a {
  font-size: 13.5px;
  color: var(--text-1);
}

@media (max-width: 900px) {
  .page {
    padding: 18px 20px 32px;
  }
  .layout {
    grid-template-columns: 1fr;
    gap: 30px;
  }
  .stage {
    position: static;
  }
  .name {
    font-size: 30px;
  }
  .specs {
    grid-template-columns: 92px 1fr;
  }
}
</style>
