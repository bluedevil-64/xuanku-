# XUANKU · Good design comes home

A **front-end-only** e-commerce visual experiment. White canvas, black-and-grey type, and one consistent motion language — inspired by Apple's design philosophy: restrained, physical, content-first.

No backend required: product data ships in `public/demo/products.json`, and the AI concierge runs on local intent matching with a typewriter effect — fully usable offline.

![首屏](docs/screenshots/hero.png)

## Motion language (v3 · Apple-inspired)

One easing curve (`cubic-bezier(0.22,1,0.36,1)`), three durations (0.2s hover / 0.45s transition / 0.9s entrance), and only translation, opacity, blur and subtle scale. No rotation, no tilt, no bounces, no gimmicks.

| Layer | Motion |
| --- | --- |
| Scrolling | Inertial smooth scroll (Lenis-style, zero-dependency) + top progress line + View Transition route fades |
| Entrance | Per-character blur-rise headline, staggered grid reveal, count-up stats |
| Ambience | Slow drifting hairline waves (Canvas), paused off-screen |
| Commerce | Quick-add button, mini-cart flyout, cart badge pop, search underline |
| Feedback | Underline slide-in links, footer brand monolith, Eames quote |

Built with Vue 3 + Vite + Pinia; Element Plus included **on-demand** (only `ElMessage` styles) — main bundle 204 kB / gzip 77 kB.
| AI 导购 | 右下黑色胶囊按钮 → 深色玻璃面板（白底上唯一的深色层次），本地意图匹配（预算/品类/新品/性价比）+ 逐字打字机 |

![商品目录](docs/screenshots/catalog.png)
![AI 导购](docs/screenshots/ai-dock.png)
![详情页](docs/screenshots/product.png)
![移动端](docs/screenshots/mobile.png)

## 技术栈

- Vue 3.5 + Vite 8 + Pinia + Vue Router（History 模式）
- Element Plus **仅按需引入 `ElMessage`**（含样式），主包 198 kB / gzip 76 kB
- 零 UI 框架依赖的视觉层：全部手写 CSS 令牌与关键帧
- 数据兜底：`src/api/demo.js` 仅在接口失败时启用，有后端时永不覆盖真实数据

## 快速开始

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # 产物在 dist/
npm run preview
```

## 部署

**Cloudflare Pages**

```bash
npx wrangler pages deploy dist --project-name=<project> --branch=main
```

**GitHub Pages**：把 `dist/` 推到 `gh-pages` 分支，注意 SPA 回退（`public/_redirects` 仅 Cloudflare 生效，GitHub Pages 需要用 404.html 方案）。

产物已内置：

- `_redirects`：`/* → /index.html 200`，深链不 404
- `_headers`：资源长缓存、`index.html` 不缓存、基础安全头

## 目录

```
src/
├── api/            # axios 封装、SSE、静态兜底快照
├── components/     # ShopLayout（壳）、AiDock（本地 AI 导购）
├── directives/     # v-reveal 入场指令
├── router/
├── stores/         # 用户 / 购物车
├── views/shop/     # 首页、详情、购物车、订单、登录、个人中心
└── style.css       # 设计令牌 + Element Plus 浅色映射
```

## 边界

这是展示站，不是交易系统：登录、下单、订单都依赖后端接口，静态环境下会提示失败，属预期行为。购物车存在 localStorage，加购本身可用。
