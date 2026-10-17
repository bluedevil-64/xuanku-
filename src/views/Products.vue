<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { adminApi } from '../api'

const list = ref([])
const total = ref(0)
const page = ref(1)
const size = ref(20)
const keyword = ref('')
const status = ref('')
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const data = await adminApi.products({
      keyword: keyword.value || undefined,
      status: status.value === '' ? undefined : status.value,
      page: page.value,
      size: size.value,
    })
    list.value = data.records || []
    total.value = data.total || 0
  } finally {
    loading.value = false
  }
}

onMounted(load)

function search() {
  page.value = 1
  load()
}

const dlg = ref(false)
const saving = ref(false)
const form = reactive({ id: null, name: '', price: null, originalPrice: null, stock: null, tag: '' })

function openEdit(row) {
  form.id = row.id
  form.name = row.name
  form.price = Number(row.price)
  form.originalPrice = row.originalPrice == null ? null : Number(row.originalPrice)
  form.stock = row.stock
  form.tag = row.tag || ''
  dlg.value = true
}

async function save() {
  if (form.price == null || form.price <= 0) {
    ElMessage.warning('价格必须大于 0')
    return
  }
  saving.value = true
  try {
    await adminApi.updateProduct(form.id, {
      price: form.price,
      originalPrice: form.originalPrice,
      stock: form.stock,
      tag: form.tag || '',
    })
    ElMessage.success('已保存，商城即时生效')
    dlg.value = false
    load()
  } catch {
    // 失败提示由拦截器负责
  } finally {
    saving.value = false
  }
}

async function toggle(row) {
  const next = row.status === 1 ? 0 : 1
  await adminApi.updateProduct(row.id, { status: next })
  ElMessage.success(next === 1 ? '已上架' : '已下架')
  load()
}

function money(v) {
  return Number(v ?? 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}
</script>

<template>
  <div class="page">
    <header class="head">
      <h1>商品</h1>
      <p>上下架、调价、改库存，商城即时生效</p>
    </header>

    <div class="toolbar">
      <el-input
        v-model="keyword"
        placeholder="搜索商品名称或分类"
        clearable
        style="width: 260px"
        @keyup.enter="search"
        @clear="search"
      />
      <el-radio-group v-model="status" @change="search">
        <el-radio-button value="">全部</el-radio-button>
        <el-radio-button :value="1">已上架</el-radio-button>
        <el-radio-button :value="0">已下架</el-radio-button>
      </el-radio-group>
      <el-button @click="search">查询</el-button>
      <span class="spacer"></span>
      <span class="count">共 {{ total }} 件</span>
    </div>

    <el-table :data="list" v-loading="loading">
      <el-table-column label="商品" min-width="260">
        <template #default="{ row }">
          <div class="cell-product">
            <img v-if="row.image" :src="row.image" alt="" />
            <div>
              <div class="name">{{ row.name }}</div>
              <div class="sub">{{ row.subtitle }}</div>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="category" label="分类" width="90" />
      <el-table-column label="价格" width="120">
        <template #default="{ row }">¥{{ money(row.price) }}</template>
      </el-table-column>
      <el-table-column prop="stock" label="库存" width="90" />
      <el-table-column prop="sales" label="销量" width="90" />
      <el-table-column label="咨询" width="90">
        <template #default="{ row }">{{ row.consultCount ?? 0 }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'" size="small">
            {{ row.status === 1 ? '在售' : '已下架' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="170" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link :type="row.status === 1 ? 'warning' : 'success'" @click="toggle(row)">
            {{ row.status === 1 ? '下架' : '上架' }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      :page-size="size"
      :total="total"
      layout="prev, pager, next"
      class="pager"
      @current-change="load"
    />

    <el-dialog v-model="dlg" title="编辑商品" width="440px">
      <el-form label-width="80px">
        <el-form-item label="商品">{{ form.name }}</el-form-item>
        <el-form-item label="售价">
          <el-input v-model.number="form.price" type="number" />
        </el-form-item>
        <el-form-item label="原价">
          <el-input v-model.number="form.originalPrice" type="number" placeholder="留空不展示划线价" />
        </el-form-item>
        <el-form-item label="库存">
          <el-input v-model.number="form.stock" type="number" />
        </el-form-item>
        <el-form-item label="标签">
          <el-input v-model="form.tag" maxlength="8" placeholder="如：热销 / 新品，留空不显示" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dlg = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page {
  max-width: 1240px;
  margin: 0 auto;
}

.head {
  margin-bottom: 22px;
}

.head h1 {
  margin: 0;
  font-size: 30px;
  font-weight: 600;
  letter-spacing: -1px;
  color: var(--text-1);
}

.head p {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--text-3);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.spacer {
  flex: 1;
}

.count {
  font-size: 12.5px;
  color: var(--text-3);
}

.cell-product {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cell-product img {
  width: 42px;
  height: 42px;
  border-radius: 8px;
  object-fit: cover;
  flex: none;
}

.name {
  font-size: 13.5px;
  color: var(--text-1);
}

.sub {
  margin-top: 3px;
  font-size: 11.5px;
  color: var(--text-3);
}

.pager {
  margin-top: 16px;
}
</style>
