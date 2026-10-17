<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { shopApi } from '../../api'
import { demoProduct } from '../../api/demo'
import { useCartStore } from '../../stores/cart'
import ProductAdvisor from '../../components/ProductAdvisor.vue'

const route = useRoute()
const router = useRouter()
const cart = useCartStore()

const product = ref(null)
const qty = ref(1)
const loading = ref(true)
const advisor = ref(null)

/** 从购买区跳到下方 AI 顾问并展开 */
function askAi() {
  advisor.value?.expand()
  document.querySelector('.advisor')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

const specList = computed(() =>
  (product.value?.specs || '')
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      const i = line.indexOf('=')
      return i < 0 ? { k: line.trim(), v: '' } : { k: line.slice(0, i).trim(), v: line.slice(i + 1).trim() }
    }),
)

async function load() {
  loading.value = true
  try {
    product.value = await shopApi.product(route.params.id, true)
    qty.value = 1
  } catch {
    // 接口不可用（纯静态部署）时退回打包快照，详情页仍可查看
    product.value = await demoProduct(route.params.id)
    qty.value = 1
  } finally {
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
</script>

<template>
  <div class="page">
    <router-link to="/shop" class="back">← 全部商品</router-link>

    <div v-if="loading" class="skeleton"></div>

    <div v-else-if="!product" class="missing">
      <p>商品不存在或已下架</p>
      <router-link to="/shop">去看看其他商品</router-link>
    </div>

    <div v-else class="layout">
      <div class="gallery" :class="[`tone-${product.tone}`, `s${shapeOf(product.id)}`]">
        <img v-if="product.image" :src="product.image" :alt="product.name" class="photo" />
        <span v-else class="shape"></span>
        <span v-if="product.tag" class="tag">{{ product.tag }}</span>
      </div>

      <div class="info">
        <p class="cat">{{ product.category }}</p>
        <h1>{{ product.name }}</h1>
        <p class="sub">{{ product.subtitle }}</p>

        <div class="rating">
          <span class="star">★</span>
          <span>{{ product.rating }}</span>
          <span class="sep">·</span>
          <span>已售 {{ product.sales }}</span>
          <span class="sep">·</span>
          <span>库存 {{ product.stock }}</span>
        </div>

        <div class="price">
          <span class="now">¥{{ money(product.price) }}</span>
          <s v-if="product.originalPrice" class="was">¥{{ money(product.originalPrice) }}</s>
        </div>

        <p class="desc">{{ product.description }}</p>

        <div class="buy">
          <div class="qty">
            <button :disabled="qty <= 1" @click="qty = Math.max(1, qty - 1)">−</button>
            <span>{{ qty }}</span>
            <button :disabled="qty >= product.stock" @click="qty = Math.min(product.stock, qty + 1)">
              +
            </button>
          </div>
          <button class="add" @click="addToCart">加入购物车</button>
          <button class="now-buy" @click="buyNow">立即购买</button>
          <button class="ask-ai" @click="askAi">问 AI 导购</button>
        </div>

        <dl class="specs">
          <template v-for="s in specList" :key="s.k">
            <dt>{{ s.k }}</dt>
            <dd>{{ s.v }}</dd>
          </template>
        </dl>

        <ProductAdvisor ref="advisor" v-if="product" :product="product" />

        <p class="service">支持 7 天无理由退换 · 满 199 包邮 · 保修以规格说明为准</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  max-width: 1240px;
  margin: 0 auto;
  /* 底部留白，避免右下角悬浮客服按钮压住内容 */
  padding: 36px 40px 96px;
}

.back {
  font-size: 13px;
  color: #86868b;
  text-decoration: none;
  transition: color 0.2s;
}

.back:hover {
  color: #1d1d1f;
}

.layout {
  display: grid;
  grid-template-columns: 1.05fr 1fr;
  gap: 76px;
  margin-top: 28px;
  align-items: start;
}

.gallery {
  position: sticky;
  top: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1 / 1;
  border-radius: 28px;
  overflow: hidden;
}

.shape {
  display: block;
  background-image: linear-gradient(155deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.28));
  box-shadow: 0 46px 80px -32px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.6);
  animation: float 7s ease-in-out infinite;
}

.photo {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
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
  top: 20px;
  left: 20px;
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(10px);
  font-size: 11.5px;
  font-weight: 500;
  color: #1d1d1f;
}

.cat {
  margin: 0 0 14px;
  font-size: 11.5px;
  letter-spacing: 1.6px;
  text-transform: uppercase;
  color: #a1a1a6;
}

.info h1 {
  margin: 0;
  font-size: 40px;
  line-height: 1.12;
  font-weight: 600;
  letter-spacing: -1.5px;
  color: #1d1d1f;
}

.sub {
  margin: 12px 0 0;
  font-size: 16px;
  color: #6e6e73;
}

.rating {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 18px;
  font-size: 12.5px;
  color: #86868b;
}

.star {
  color: #1d1d1f;
  font-size: 12px;
}

.sep {
  color: #d2d2d7;
}

.price {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-top: 22px;
}

.now {
  font-size: 30px;
  font-weight: 600;
  letter-spacing: -0.8px;
  color: #1d1d1f;
}

.was {
  font-size: 14px;
  color: #b0b0b6;
}

.desc {
  margin: 24px 0 0;
  font-size: 14.5px;
  line-height: 1.78;
  color: #6e6e73;
}

.buy {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 32px;
}

.qty {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 46px;
  padding: 0 4px;
  border-radius: 999px;
  background: #f5f5f7;
}

.qty button {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #1d1d1f;
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
  min-width: 26px;
  text-align: center;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}

.add,
.now-buy {
  height: 46px;
  padding: 0 26px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.3s cubic-bezier(0.32, 0.72, 0, 1),
    box-shadow 0.2s;
}

.add {
  border: none;
  background: #1d1d1f;
  color: #fff;
}

.add:hover {
  background: #000;
  transform: translateY(-1px);
}

.now-buy {
  border: 0.5px solid rgba(0, 0, 0, 0.16);
  background: #fff;
  color: #1d1d1f;
}

.now-buy:hover {
  border-color: #1d1d1f;
}

.ask-ai {
  height: 46px;
  padding: 0 4px;
  border: none;
  background: none;
  color: #6e6e73;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: color 0.2s;
}

.ask-ai:hover {
  color: #1d1d1f;
}

.specs {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 0;
  margin: 40px 0 0;
  border-top: 0.5px solid rgba(0, 0, 0, 0.08);
}

.specs dt,
.specs dd {
  margin: 0;
  padding: 13px 0;
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.08);
  font-size: 13.5px;
  line-height: 1.5;
}

.specs dt {
  color: #86868b;
}

.specs dd {
  color: #1d1d1f;
}

.service {
  margin: 22px 0 0;
  font-size: 12px;
  color: #a1a1a6;
}

.skeleton {
  margin-top: 28px;
  height: 520px;
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
  padding: 120px 0;
  text-align: center;
}

.missing p {
  margin: 0 0 16px;
  font-size: 16px;
  color: #6e6e73;
}

.missing a {
  font-size: 14px;
  color: #1d1d1f;
}

@media (max-width: 900px) {
  .page {
    padding: 24px 20px 32px;
  }
  .layout {
    grid-template-columns: 1fr;
    gap: 32px;
  }
  .gallery {
    position: static;
  }
  .info h1 {
    font-size: 30px;
    letter-spacing: -1px;
  }
  .specs {
    grid-template-columns: 96px 1fr;
  }
  .buy {
    flex-wrap: wrap;
  }
}
</style>
