<script setup>
/**
 * Waves：hero 背景的一组黑白细线波浪（移植自 "silk / waves" 类 canvas 动效）。
 * 多行正弦叠加缓慢漂移，进出视口自动暂停，reduced-motion 只画静态一帧。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  rows: { type: Number, default: 16 },
})

const canvasRef = ref(null)
let raf = 0
let running = false
let W = 0
let H = 0
let dpr = 1
let io = null

function resize() {
  const el = canvasRef.value
  if (!el) return
  const rect = el.parentElement.getBoundingClientRect()
  dpr = Math.min(2, window.devicePixelRatio || 1)
  W = rect.width
  H = rect.height
  el.width = W * dpr
  el.height = H * dpr
  el.style.width = `${W}px`
  el.style.height = `${H}px`
}

function draw(t) {
  const ctx = canvasRef.value?.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, W, H)

  for (let i = 0; i < props.rows; i++) {
    const p = i / (props.rows - 1)
    const baseY = H * (0.18 + p * 0.75)
    const amp = 10 + p * 22
    const alpha = 0.05 + p * 0.07

    ctx.beginPath()
    for (let x = -10; x <= W + 10; x += 6) {
      const y =
        baseY +
        Math.sin(x * 0.006 + t * 0.00045 + i * 0.42) * amp +
        Math.sin(x * 0.0018 - t * 0.00028 + i * 0.9) * amp * 0.55
      x === -10 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.strokeStyle = `rgba(29, 29, 31, ${alpha.toFixed(3)})`
    ctx.lineWidth = 1
    ctx.stroke()
  }
}

function loop(t) {
  draw(t)
  raf = requestAnimationFrame(loop)
}

function start() {
  if (running) return
  running = true
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    draw(2200) // 静态一帧
    return
  }
  raf = requestAnimationFrame(loop)
}

function stop() {
  running = false
  cancelAnimationFrame(raf)
}

onMounted(() => {
  resize()
  window.addEventListener('resize', resize)

  io = new IntersectionObserver(
    (entries) => (entries.some((e) => e.isIntersecting) ? start() : stop()),
    { threshold: 0 },
  )
  io.observe(canvasRef.value.parentElement)
})

onBeforeUnmount(() => {
  stop()
  io?.disconnect()
  window.removeEventListener('resize', resize)
})
</script>

<template>
  <canvas ref="canvasRef" class="waves" aria-hidden="true"></canvas>
</template>

<style scoped>
.waves {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
</style>
