<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AdminLayout from './components/AdminLayout.vue'
import ShopLayout from './components/ShopLayout.vue'

const route = useRoute()

const layouts = {
  admin: AdminLayout,
  shop: ShopLayout,
}

/** blank（两套登录页）不套外壳，直接渲染 */
const layout = computed(() => layouts[route.meta.layout])
</script>

<template>
  <component :is="layout" v-if="layout">
    <router-view />
  </component>
  <router-view v-else />
</template>
