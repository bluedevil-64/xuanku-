<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { kbApi } from '../api'

const documents = ref([])
const faqs = ref([])
const uploadRef = ref(null)
const faqDialogVisible = ref(false)
const faqSaving = ref(false)
const uploading = ref(false)

const faqForm = reactive({ id: null, question: '', answer: '' })

onMounted(() => {
  loadDocuments()
  loadFaqs()
})

async function loadDocuments() {
  documents.value = await kbApi.documents()
}

async function loadFaqs() {
  faqs.value = await kbApi.faqs()
}

async function onUpload(options) {
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', options.file)
    const doc = await kbApi.uploadDocument(fd)
    ElMessage.success(`已入库：${doc.chunkCount} 个分块`)
    loadDocuments()
  } catch {
    // 错误提示由 http 封装统一弹出
  } finally {
    uploading.value = false
    if (uploadRef.value) uploadRef.value.clearFiles()
  }
}

async function deleteDocument(doc) {
  await ElMessageBox.confirm(`确认删除文档「${doc.title}」？其向量数据将一并清除`, '提示', { type: 'warning' })
  await kbApi.deleteDocument(doc.id)
  ElMessage.success('已删除')
  loadDocuments()
}

function openFaqDialog(faq) {
  faqForm.id = faq ? faq.id : null
  faqForm.question = faq ? faq.question : ''
  faqForm.answer = faq ? faq.answer : ''
  faqDialogVisible.value = true
}

async function saveFaq() {
  if (!faqForm.question.trim() || !faqForm.answer.trim()) {
    ElMessage.warning('问题和答案不能为空')
    return
  }
  faqSaving.value = true
  try {
    const body = { question: faqForm.question, answer: faqForm.answer }
    if (faqForm.id) {
      await kbApi.updateFaq(faqForm.id, body)
    } else {
      await kbApi.createFaq(body)
    }
    ElMessage.success('已保存')
    faqDialogVisible.value = false
    loadFaqs()
  } finally {
    faqSaving.value = false
  }
}

async function deleteFaq(faq) {
  await ElMessageBox.confirm(`确认删除该 FAQ？`, '提示', { type: 'warning' })
  await kbApi.deleteFaq(faq.id)
  ElMessage.success('已删除')
  loadFaqs()
}

function fmtTime(t) {
  if (!t) return ''
  return t.replace('T', ' ').slice(0, 16)
}
</script>

<template>
  <div class="kb-page">
    <div class="page-head">
      <h1 class="page-title">知识库</h1>
      <p class="page-sub">文档上传自动分块向量化，FAQ 修改即生效</p>
    </div>
    <el-card shadow="never" class="kb-card">
      <template #header>
        <div class="card-head">
          <span>知识库文档</span>
          <el-upload
            ref="uploadRef"
            :show-file-list="false"
            :http-request="onUpload"
            accept=".txt,.md"
            :disabled="uploading"
          >
            <el-button type="primary" :loading="uploading">上传文档（txt/md）</el-button>
          </el-upload>
        </div>
      </template>
      <el-table :data="documents" v-loading="uploading" empty-text="暂无文档">
        <el-table-column prop="title" label="标题" min-width="180" />
        <el-table-column prop="fileName" label="文件名" min-width="160" />
        <el-table-column prop="charCount" label="字符数" width="100" />
        <el-table-column prop="chunkCount" label="分块数" width="100" />
        <el-table-column label="上传时间" width="170">
          <template #default="{ row }">{{ fmtTime(row.createTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="90">
          <template #default="{ row }">
            <el-button link type="danger" @click="deleteDocument(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card shadow="never" class="kb-card">
      <template #header>
        <div class="card-head">
          <span>FAQ 维护</span>
          <el-button type="primary" @click="openFaqDialog(null)">新增 FAQ</el-button>
        </div>
      </template>
      <el-table :data="faqs" empty-text="暂无 FAQ">
        <el-table-column prop="question" label="问题" min-width="220" />
        <el-table-column prop="answer" label="答案" min-width="300" show-overflow-tooltip />
        <el-table-column label="更新时间" width="170">
          <template #default="{ row }">{{ fmtTime(row.updateTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140">
          <template #default="{ row }">
            <el-button link type="primary" @click="openFaqDialog(row)">编辑</el-button>
            <el-button link type="danger" @click="deleteFaq(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="faqDialogVisible" :title="faqForm.id ? '编辑 FAQ' : '新增 FAQ'" width="560">
      <el-form label-width="60">
        <el-form-item label="问题">
          <el-input v-model="faqForm.question" maxlength="255" show-word-limit placeholder="用户可能的问法" />
        </el-form-item>
        <el-form-item label="答案">
          <el-input v-model="faqForm.answer" type="textarea" :rows="5" placeholder="标准答案" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="faqDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="faqSaving" @click="saveFaq">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.kb-page {
  max-width: 1080px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* iOS 大标题 */
.page-head {
  padding: 4px 4px 2px;
}

.page-title {
  margin: 0;
  font-size: 30px;
  font-weight: 700;
  letter-spacing: -0.9px;
  color: var(--text-1);
}

.page-sub {
  margin: 6px 0 0;
  font-size: 14px;
  color: var(--text-2);
}

.kb-card {
  border: 1px solid var(--border-1);
  border-radius: var(--radius-card);
  background: #fff;
  box-shadow: none !important;
}

.kb-card :deep(.el-card__header) {
  padding: 15px 20px;
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15.5px;
  font-weight: 650;
  letter-spacing: -0.2px;
  color: var(--text-1);
}
</style>
