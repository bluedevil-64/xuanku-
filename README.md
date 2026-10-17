# Xuanku · AI 商城前端展示站

一个独立的高视觉规格电商前端展示站，从 AiDesk 项目拆出，**不依赖后端**即可完整浏览。

- 技术：Vue 3 + Vite + Pinia + Vue Router，纯静态托管
- 数据：`public/demo/products.json` 打包快照，接口不可用时自动兜底
- 部署：Cloudflare Pages / GitHub Pages 均可（SPA 需回退到 `index.html`）

## 本地开发

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 产物在 dist/
```

## 路由

| 路径 | 页面 |
| --- | --- |
| `/shop` | 首页（商品列表、分类、排序） |
| `/shop/p/:id` | 商品详情 |
| `/shop/cart` | 购物车 |
| `/shop/orders` | 我的订单 |
| `/shop/account` | 个人中心 |

纯静态环境下登录、下单、AI 客服不可用，属预期。
