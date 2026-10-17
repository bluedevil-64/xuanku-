<script setup>
/**
 * 全局自定义光标：白色小点即时跟随 + 圆环滞后追踪。
 * 用 mix-blend-mode: difference 反色 —— 白底上是黑色、深色图上是白色，
 * 黑白站里最「studio」的玩法。触屏 / 减少动效环境自动禁用。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'

const enabled = ref(false)
const x = ref(-100)
const y = ref(-100)
const rx = ref(-100)
const ry = ref(-100)
const active = ref(false)
const down = ref(false)
const gone = ref(true)

let targetX = -100
let targetY = -100
let raf = 0

function fine() {
  return (
    window.matchMedia('(pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function onMove(e) {
  targetX = e.clientX
  targetY = e.clientY
  x.value = e.clientX
  y.value = e.clientY
  gone.value = false
  const el = e.target
  active.value = !!(
    el.closest &&
    el.closest('a, button, .card, input, textarea, select, [data-cursor]')
  )
}

function onDown() {
  down.value = true
}

function onUp() {
  down.value = false
}

function onLeave() {
  gone.value = true
}

function loop() {
  // 圆环以 lerp 滞后追踪，产生「拖尾」手感
  rx.value += (targetX - rx.value) * 0.16
  ry.value += (targetY - ry.value) * 0.16
  raf = requestAnimationFrame(loop)
}

onMounted(() => {
  if (!fine()) return
  enabled.value = true
  document.documentElement.classList.add('has-cursor-fx')
  window.addEventListener('mousemove', onMove, { passive: true })
  window.addEventListener('mousedown', onDown)
  window.addEventListener('mouseup', onUp)
  document.documentElement.addEventListener('mouseleave', onLeave)
  loop()
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMove)
  window.removeEventListener('mousedown', onDown)
  window.removeEventListener('mouseup', onUp)
  document.documentElement.removeEventListener('mouseleave', onLeave)
  cancelAnimationFrame(raf)
  document.documentElement.classList.remove('has-cursor-fx')
})
</script>

<template>
  <div v-if="enabled" class="cursor-fx" aria-hidden="true">
    <span
      class="dot"
      :class="{ hide: gone, on: active }"
      :style="{ transform: `translate3d(${x}px, ${y}px, 0)` }"
    >
      <i></i>
    </span>
    <span
      class="ring"
      :class="{ hide: gone, on: active, press: down }"
      :style="{ transform: `translate3d(${rx}px, ${ry}px, 0)` }"
    >
      <i></i>
    </span>
  </div>
</template>

<style scoped>
.cursor-fx {
  position: fixed;
  inset: 0;
  z-index: 9998;
  pointer-events: none;
}

.dot,
.ring {
  position: fixed;
  top: 0;
  left: 0;
  will-change: transform;
}

.dot i,
.ring i {
  position: absolute;
  top: 0;
  left: 0;
  display: block;
  background: #fff;
  mix-blend-mode: difference;
  transition: width 0.25s var(--ease-out), height 0.25s var(--ease-out),
    opacity 0.3s, margin 0.25s var(--ease-out);
}

/* 小点：即时跟随，悬停可点元素时略放大 */
.dot i {
  width: 6px;
  height: 6px;
  margin: -3px 0 0 -3px;
  border-radius: 50%;
}

.dot.on i {
  width: 3px;
  height: 3px;
  margin: -1.5px 0 0 -1.5px;
}

/* 圆环：滞后追踪，悬停放大、按下收缩 */
.ring i {
  width: 30px;
  height: 30px;
  margin: -15px 0 0 -15px;
  border-radius: 50%;
  background: none;
  border: 1.2px solid #fff;
  mix-blend-mode: difference;
  transition: width 0.3s var(--ease-out), height 0.3s var(--ease-out),
    margin 0.3s var(--ease-out), opacity 0.3s;
}

.ring.on i {
  width: 46px;
  height: 46px;
  margin: -23px 0 0 -23px;
  border-width: 1.5px;
}

.ring.press i {
  width: 20px;
  height: 20px;
  margin: -10px 0 0 -10px;
}

.hide {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .cursor-fx {
    display: none;
  }
}
</style>
