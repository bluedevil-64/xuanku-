/**
 * 纯静态部署兜底数据。
 *
 * Cloudflare Pages 只托管静态文件，没有 Spring Boot，所以 /api/shop/* 会 404。
 * 这里把商城首页/详情页需要的最小数据集（public/demo/products.json）打包进产物，
 * **仅在接口请求失败时启用**：有后端时永远不会走到，不会覆盖线上真实数据。
 */
let cache = null

async function load() {
  if (cache) return cache
  try {
    const resp = await fetch('/demo/products.json', { cache: 'force-cache' })
    cache = resp.ok ? await resp.json() : { products: [], categories: [] }
  } catch {
    cache = { products: [], categories: [] }
  }
  return cache
}

/** 与后端 /shop/products 的分页+筛选语义保持一致，保证静态态下分类/排序仍可用 */
export async function demoProducts({ category, keyword, sort, size = 24 } = {}) {
  const { products } = await load()
  let list = [...products]
  if (category) list = list.filter((p) => p.category === category)
  if (keyword) {
    const kw = String(keyword).toLowerCase()
    list = list.filter(
      (p) =>
        (p.name || '').toLowerCase().includes(kw) ||
        (p.subtitle || '').toLowerCase().includes(kw) ||
        (p.description || '').toLowerCase().includes(kw),
    )
  }
  switch (sort) {
    case 'price_asc':
      list.sort((a, b) => Number(a.price) - Number(b.price))
      break
    case 'price_desc':
      list.sort((a, b) => Number(b.price) - Number(a.price))
      break
    case 'new':
      list.sort((a, b) => Number(b.id) - Number(a.id))
      break
    default:
      list.sort((a, b) => Number(b.sales || 0) - Number(a.sales || 0))
  }
  return { records: list.slice(0, size), total: list.length }
}

export async function demoProduct(id) {
  const { products } = await load()
  return products.find((p) => String(p.id) === String(id)) || null
}

export async function demoCategories() {
  const { categories } = await load()
  return categories || []
}

/** 静态态下任何「需要写库」的操作都直接失败，由调用方给出提示 */
export function staticBlocked() {
  return new Error('This is a static demo — orders and sign-in need a backend')
}
