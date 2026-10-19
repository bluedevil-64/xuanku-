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

## 三、设计系统（当前基线 v2 · 浅色）

- 底色 `#ffffff`，表面 `#f5f5f7`，描边 `rgba(0,0,0,0.08)`，文字三级 `#1d1d1f / #6e6e73 / #a1a1a6`
- 主色黑 `#1d1d1f`，**禁止引入彩色强调**；点缀只允许：客服绿点 `#34c759`、极淡彩光球（白底呼吸感，opacity ≤ 0.1）
- 圆角：卡片 20–24px，控件 12px，胶囊 999px
- 字距：大标题 `-0.045em`，正文 `-0.01em`
- 动效主力（v3 · Apple 化收敛后）：惯性平滑滚动、逐字 blur 入场、滚动视差、波浪线背景、数字滚动、滚动进度线、迷你购物车浮层、View Transition 转场、错峰入场
- **动效规范（一切新动效必须遵守）**：
  - 单一缓动 `cubic-bezier(0.22, 1, 0.36, 1)`；时长三档：0.2s hover / 0.45s 元素进出 / 0.9s 入场叙事
  - 只用位移（≤12px）/ opacity / blur / scale（≤1.05）表达；**禁用 rotate、tilt、弹跳、绕行光点、文字扫光、字符乱序**
  - hover 一律「阴影加深 + 位移 ≤2px + scale ≤1.02」，全站一致
  - 持续动画（波浪、marquee）必须低速低对比，且尊重 `prefers-reduced-motion`
- **改动以微调为主**：整屏重做前先出局部样本确认

## 四、验证纪律

每次改完必须：

1. `npm run build` 通过（关注 chunk 体积，主包不应超过 250 kB）
2. 起 dev server，用 Playwright 截 1600×980 桌面 + 390×844 移动两档
3. 控制台除 `/api/*` 的预期失败外，不应有 pageerror
4. 检查 4 处深链：`/shop`、`/shop/p/:id`、`/shop/cart`、`/shop/login`

## 五、提交

`feat: / fix: / docs: / style: 描述`，一个功能点一提交。视觉大改单独提交，便于回滚。
