import { createApp } from 'vue'
import { createPinia } from 'pinia'
// 全站只用到 ElMessage 这一个命令式组件，按需引样式，不整包引入 Element Plus
import 'element-plus/theme-chalk/base.css'
import 'element-plus/theme-chalk/el-message.css'
import './style.css'
import App from './App.vue'
import router from './router'
import reveal from './directives/reveal'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.directive('reveal', reveal)
app.mount('#app')
