<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ShopLayout from './components/ShopLayout.vue'

const route = useRoute()

const layouts = {
  shop: ShopLayout,
}

/** blank（登录页）不套外壳，直接渲染 */
const layout = computed(() => layouts[route.meta.layout])
</script>

<template>
  <component :is="layout" v-if="layout">
    <router-view />
  </component>
  <router-view v-else />
</template>
