<script setup>
import { computed, inject, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { shopApi } from '../../api'
import { demoProduct } from '../../api/demo'
import { useCartStore } from '../../stores/cart'

const route = useRoute()
const router = useRouter()
const cart = useCartStore()
const openChat = inject('openChat', () => {})

const product = ref(null)
const qty = ref(1)
const loading = ref(true)

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
  ElMessage.success(`已加入购物车 · ${product.value.name} × ${qty.value}`)
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
      全部物件
    </router-link>

    <div v-if="loading" class="skeleton"></div>

    <div v-else-if="!product" class="missing">
      <p>这件东西不在了</p>
      <router-link to="/shop">看看其他物件 →</router-link>
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
          <li><span class="dot"></span>顺丰 24h 发出</li>
          <li><span class="dot"></span>7 天无理由</li>
          <li><span class="dot"></span>一年质保</li>
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
          <span>已售 {{ product.sales }}</span>
          <span class="sep"></span>
          <span>库存 {{ product.stock }}</span>
        </div>

        <div class="price">
          <span class="now">¥{{ money(product.price) }}</span>
          <s v-if="product.originalPrice" class="was">¥{{ money(product.originalPrice) }}</s>
          <span v-if="product.originalPrice" class="save">
            省 ¥{{ money(product.originalPrice - product.price) }}
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
            加入购物车
          </button>
          <button class="now-buy" @click="buyNow">立即购买</button>
        </div>

        <button class="ask" @click="openChat">
          <span class="spark"></span>
          问 AI 导购：这件适合我吗？
        </button>

        <dl class="specs">
          <template v-for="s in specList" :key="s.k">
            <dt>{{ s.k }}</dt>
            <dd>{{ s.v }}</dd>
          </template>
        </dl>
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
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 50px 100px -50px rgba(0, 0, 0, 1);
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
  background: radial-gradient(120% 90% at 20% 0%, rgba(255, 255, 255, 0.16), transparent 55%);
  mix-blend-mode: soft-light;
}

.shape {
  display: block;
  background-image: linear-gradient(155deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.28));
  box-shadow: 0 46px 80px -32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.6);
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
  background: linear-gradient(148deg, #3d3d45 0%, #16161c 74%);
}
.tone-graphite .shape {
  background-image: linear-gradient(155deg, rgba(255, 255, 255, 0.32), rgba(255, 255, 255, 0.05));
}
.tone-sand {
  background: linear-gradient(148deg, #d9c9ae 0%, #9c8a70 100%);
}
.tone-violet {
  background: linear-gradient(148deg, #b8b0e8 0%, #6b5fa8 100%);
}
.tone-cream {
  background: linear-gradient(148deg, #e6d9c0 0%, #b3a184 100%);
}
.tone-ocean {
  background: linear-gradient(148deg, #a9c9dd 0%, #5d7f95 100%);
}
.tone-stone {
  background: linear-gradient(148deg, #cfc8bf 0%, #8d867d 100%);
}
.tone-rose {
  background: linear-gradient(148deg, #e0b3c2 0%, #a06a7e 100%);
}
.tone-emerald {
  background: linear-gradient(148deg, #a8cbb8 0%, #5e8570 100%);
}

.tag {
  position: absolute;
  top: 18px;
  left: 18px;
  z-index: 3;
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(10, 10, 14, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(14px);
  font-size: 11px;
  font-weight: 500;
  color: #f0f0f4;
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
  background: var(--accent-2);
  box-shadow: 0 0 8px 1px rgba(60, 232, 210, 0.6);
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
  color: var(--warn);
  font-size: 12px;
}

.sep {
  width: 1px;
  height: 10px;
  background: rgba(255, 255, 255, 0.12);
}

.price {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-top: 26px;
  padding-bottom: 26px;
  border-bottom: 1px solid var(--hairline);
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
  background: rgba(255, 122, 184, 0.14);
  color: #ff9ec8;
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
  background: rgba(255, 255, 255, 0.035);
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
  background: rgba(255, 255, 255, 0.08);
}

.qty button:disabled {
  color: #3f3f49;
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
  background: #f4f4f7;
  color: #08080c;
  box-shadow: 0 18px 40px -22px rgba(255, 255, 255, 0.7);
}

.add:hover {
  box-shadow: 0 24px 50px -22px rgba(255, 255, 255, 0.9);
}

.now-buy {
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: transparent;
  color: var(--text-1);
}

.now-buy:hover {
  border-color: var(--brand-border);
  background: rgba(124, 108, 255, 0.12);
}

.ask {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  margin-top: 16px;
  padding: 10px 16px;
  border-radius: 999px;
  border: 1px dashed rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.02);
  color: var(--text-2);
  font-size: 12.5px;
  font-family: inherit;
  cursor: pointer;
  transition: color 0.25s, border-color 0.25s, background-color 0.25s;
}

.ask:hover {
  color: var(--text-1);
  border-color: var(--brand-border);
  background: rgba(124, 108, 255, 0.08);
}

.spark {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-2);
  box-shadow: 0 0 0 3px rgba(60, 232, 210, 0.14), 0 0 12px 1px rgba(60, 232, 210, 0.85);
}

.specs {
  display: grid;
  grid-template-columns: 108px 1fr;
  margin: 44px 0 0;
  border-top: 1px solid var(--hairline);
}

.specs dt,
.specs dd {
  margin: 0;
  padding: 14px 0;
  border-bottom: 1px solid var(--hairline);
  font-size: 13px;
  line-height: 1.5;
}

.specs dt {
  color: var(--text-3);
}

.specs dd {
  color: var(--text-1);
}

.skeleton {
  margin-top: 26px;
  height: 560px;
  border-radius: 28px;
  background: linear-gradient(
    100deg,
    rgba(255, 255, 255, 0.03) 25%,
    rgba(255, 255, 255, 0.07) 37%,
    rgba(255, 255, 255, 0.03) 63%
  );
  background-size: 400% 100%;
  animation: shimmer 1.5s ease infinite;
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
