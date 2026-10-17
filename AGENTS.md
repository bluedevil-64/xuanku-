# AGENTS.md

本文件是本仓库的唯一项目依据。所有改动以此为准。

## 一、项目定位

- **XUANKU**：纯前端电商视觉展示站，从 AiDesk 拆出，**与后端完全解耦**
- **目的**：作品集展示。不接后端、不产生真实交易，任何一个页面打开都不应该是坏页面
- **底线**：不引入需要后端的交互；凡是需要接口才能工作的功能，要么删掉，要么用本地数据兜底

## 二、技术约束

| 项 | 约束 |
| --- | --- |
| 框架 | Vue 3 + Vite，禁用 SSR |
| UI 框架 | Element Plus 只允许按需引入命令式组件（当前仅 `ElMessage`），**禁止 `app.use(ElementPlus)`** |
| 样式 | 视觉层全部手写 CSS，颜色/圆角/动效一律走 `src/style.css` 的 `:root` 令牌，禁止在组件里写死色值 |
| 数据 | 静态兜底在 `src/api/demo.js`，快照在 `public/demo/products.json` |
| 动效 | 只用 transform / opacity；必须尊重 `prefers-reduced-motion` |
| 路由 | History 模式，新增路由后确认 `public/_redirects` 仍能把深链回退到 `index.html` |

## 三、设计系统（当前基线）

- 底色 `#07070a`，表面 `rgba(255,255,255,0.032)`，描边 `rgba(255,255,255,0.09)`
- 品牌渐变 `#a79bff → #7c6cff → #3ce8d2`（104deg）
- 圆角：卡片 22–24px，控件 14px，胶囊 999px
- 字距：大标题 `-0.045em`，正文 `-0.01em`
- 三处视觉主力：首屏巨型渐变标题、卡片鼠标光斑 + 3D 倾斜、滚动错峰入场
- **改动以微调为主**：整屏重做前先出局部样本确认

## 四、验证纪律

每次改完必须：

1. `npm run build` 通过（关注 chunk 体积，主包不应超过 250 kB）
2. 起 dev server，用 Playwright 截 1600×980 桌面 + 390×844 移动两档
3. 控制台除 `/api/*` 的预期失败外，不应有 pageerror
4. 检查 4 处深链：`/shop`、`/shop/p/:id`、`/shop/cart`、`/shop/login`

## 五、提交

`feat: / fix: / docs: / style: 描述`，一个功能点一提交。视觉大改单独提交，便于回滚。
