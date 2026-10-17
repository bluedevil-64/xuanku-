/**
 * v-reveal：元素进入视口时淡入上浮（IntersectionObserver，只播一次）
 * 用法：v-reveal 或 v-reveal="{ delay: 120 }" 制造错峰
 * 尊重 prefers-reduced-motion：系统开启减弱动效时直接显示
 */
const reduced =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default {
  mounted(el, binding) {
    if (reduced) return
    el.classList.add('reveal')
    const delay = binding.value?.delay
    if (delay) el.style.transitionDelay = `${delay}ms`

    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('reveal-in')
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          el.classList.add('reveal-in')
          io.unobserve(el)
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -48px 0px' },
    )
    io.observe(el)
    el._revealObserver = io
  },

  unmounted(el) {
    el._revealObserver?.disconnect()
    delete el._revealObserver
  },
}
