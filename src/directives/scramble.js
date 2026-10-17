/**
 * v-scramble：解码文字效果（移植自 React Bits 的 DecryptedText 思路）。
 * 元素进入视口时，字符从随机符号逐帧「解锁」成真实文案；
 * 加 .hover 修饰符后鼠标移入会重新播放。
 * 尊重 prefers-reduced-motion：直接显示原文。
 */
const POOL = '!<>-_\\/[]{}—=+*^?#________'

function play(el) {
  if (el._scrambleRaf) cancelAnimationFrame(el._scrambleRaf)
  const finalText = el.dataset.scrambleText
  const totalFrames = Math.max(20, finalText.length * 3)
  let frame = 0

  const tick = () => {
    frame += 1
    const revealed = Math.floor((frame / totalFrames) * finalText.length * 1.4)
    let out = ''
    for (let i = 0; i < finalText.length; i++) {
      const ch = finalText[i]
      if (ch === ' ' || ch === '·') {
        out += ch
      } else if (i < revealed) {
        out += ch
      } else {
        out += POOL[Math.floor(Math.random() * POOL.length)]
      }
    }
    el.textContent = out
    if (revealed < finalText.length) {
      el._scrambleRaf = requestAnimationFrame(tick)
    } else {
      el.textContent = finalText
      el._scrambleRaf = null
    }
  }
  el._scrambleRaf = requestAnimationFrame(tick)
}

export default {
  mounted(el) {
    const text = el.textContent.trim()
    el.dataset.scrambleText = text
    el.textContent = text

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          play(el)
          io.disconnect()
        }
      },
      { threshold: 0.6 },
    )
    io.observe(el)
    el._scrambleIO = io

    if (!el._scrambleHover) {
      el._scrambleHover = () => {
        if (!el._scrambleRaf) play(el)
      }
      el.addEventListener('mouseenter', el._scrambleHover)
    }
  },
  unmounted(el) {
    if (el._scrambleRaf) cancelAnimationFrame(el._scrambleRaf)
    el._scrambleIO?.disconnect()
    el.removeEventListener('mouseenter', el._scrambleHover)
  },
}
