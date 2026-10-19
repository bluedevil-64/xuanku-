/**
 * Lenis 风格的惯性平滑滚动（零依赖精简版）。
 * 滚轮事件接管为「目标位置 + lerp 追赶」，产生带阻尼的高级滚动手感。
 * 仅在鼠标设备且未开启减少动效时启用；触屏保持原生。
 * 输入框 / 可滚动面板内部的滚轮不拦截。
 */
export function initSmoothScroll() {
  if (!window.matchMedia('(pointer: fine)').matches) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  if (window.__smoothScrollInit) return
  window.__smoothScrollInit = true

  let target = window.scrollY
  let current = target
  let active = false

  const maxScroll = () =>
    Math.max(0, document.documentElement.scrollHeight - window.innerHeight)

  const shouldPassThrough = (e) =>
    e.ctrlKey ||
    e.target.closest?.(
      'input, textarea, select, .panel-body, .el-message, [data-native-scroll]',
    )

  window.addEventListener(
    'wheel',
    (e) => {
      if (shouldPassThrough(e)) return
      e.preventDefault()
      const step = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY
      target = Math.max(0, Math.min(maxScroll(), target + step))
      if (!active) {
        active = true
        current = window.scrollY
        requestAnimationFrame(loop)
      }
    },
    { passive: false },
  )

  function loop() {
    current += (target - current) * 0.105
    if (Math.abs(target - current) < 0.6) {
      current = target
      window.scrollTo({ top: current, behavior: 'instant' })
      active = false
      return
    }
    window.scrollTo({ top: current, behavior: 'instant' })
    requestAnimationFrame(loop)
  }

  // 键盘 / 锚点 / 滚动条拖动等原生滚动发生时，同步目标位置
  window.addEventListener(
    'scroll',
    () => {
      if (!active) target = window.scrollY
    },
    { passive: true },
  )
}
