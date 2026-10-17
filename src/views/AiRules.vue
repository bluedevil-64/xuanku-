<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminApi } from '../api'

const rules = ref([])
const activeKey = ref('')
const draft = ref('')
const enabled = ref(1)
const saving = ref(false)
const loading = ref(false)

const trialQuestion = ref('')
const trial = ref(null)
const trialing = ref(false)

const current = computed(() => rules.value.find((r) => r.ruleKey === activeKey.value) || null)

/** 内容被改过：保存前不允许试跑，否则对比的是旧规则，容易误判 */
const dirty = computed(() => !!current.value && draft.value !== (current.value.content || ''))

/** 商品导购规则用真实商品填充占位符，试跑要说明用的是哪件 */
const needsProduct = computed(() => activeKey.value === 'PRODUCT_ADVISOR')

onMounted(async () => {
  await load()
})

async function load(keepKey) {
  loading.value = true
  try {
    rules.value = await adminApi.aiRules()
    const key = keepKey || activeKey.value || rules.value[0]?.ruleKey
    if (key) select(key)
  } finally {
    loading.value = false
  }
}

function select(key) {
  activeKey.value = key
  const r = rules.value.find((x) => x.ruleKey === key)
  draft.value = r?.content || ''
  enabled.value = r?.enabled ?? 1
  trial.value = null
}

async function save() {
  if (!current.value) return
  if (!draft.value.trim()) {
    ElMessage.warning('规则内容不能为空，不想用时请关闭开关')
    return
  }
  saving.value = true
  try {
    await adminApi.updateAiRule(activeKey.value, { content: draft.value, enabled: enabled.value })
    ElMessage.success('已保存，下一条消息立即生效')
    await load(activeKey.value)
  } finally {
    saving.value = false
  }
}

async function toggleEnabled(val) {
  if (!current.value) return
  try {
    await adminApi.updateAiRule(activeKey.value, { enabled: val ? 1 : 0 })
    current.value.enabled = val ? 1 : 0
    ElMessage.success(val ? '已启用该规则' : '已停用，将回落到系统默认')
  } catch {
    enabled.value = val ? 0 : 1
  }
}

async function resetDefault() {
  if (!current.value) return
  await ElMessageBox.confirm('将内容恢复为系统默认提示词并重新启用，确定吗？', '恢复默认', {
    confirmButtonText: '恢复',
    cancelButtonText: '取消',
    type: 'warning',
  })
  await adminApi.resetAiRule(activeKey.value)
  ElMessage.success('已恢复默认')
  await load(activeKey.value)
}

function useDefaultContent() {
  if (!current.value) return
  draft.value = current.value.defaultContent
}

async function runTrial() {
  const q = trialQuestion.value.trim()
  if (!q) {
    ElMessage.warning('先输入一条试跑问题')
    return
  }
  trialing.value = true
  trial.value = null
  try {
    trial.value = await adminApi.trialAiRule(activeKey.value, { question: q })
  } finally {
    trialing.value = false
  }
}

/** 对比结论：字数、结构上的直观差异，省去人工逐字比对 */
const verdict = computed(() => {
  const t = trial.value
  if (!t) return ''
  if (t.samePrompt) return '当前规则与系统默认一致（或已停用），两次结果没有差别。'
  const a = (t.base?.text || '').length
  const b = (t.active?.text || '').length
  const diff = b - a
  const dir = diff === 0 ? '字数基本一致' : diff > 0 ? `长了 ${diff} 字` : `短了 ${-diff} 字`
  return `启用规则后回答${dir}，耗时 ${t.base.ms}ms → ${t.active.ms}ms。`
})
</script>

<template>
  <div class="rules-page">
    <!-- 左：规则清单 -->
    <aside class="rule-list">
      <div class="rl-head">
        <h2>AI 回答规则</h2>
        <p>控制每个场景下 AI 的身份、边界与话术</p>
      </div>
      <button
        v-for="r in rules"
        :key="r.ruleKey"
        class="rule-item"
        :class="{ on: r.ruleKey === activeKey }"
        @click="select(r.ruleKey)"
      >
        <div class="ri-top">
          <span class="ri-name">{{ r.name }}</span>
          <span class="ri-dot" :class="{ off: r.enabled !== 1 }"></span>
        </div>
        <div class="ri-desc">{{ r.description }}</div>
      </button>
    </aside>

    <!-- 右：编辑器 + 试跑 -->
    <section v-if="current" class="rule-main">
      <header class="rm-head">
        <div class="rm-title">
          <h3>{{ current.name }}</h3>
          <code>{{ current.ruleKey }}</code>
        </div>
        <div class="rm-actions">
          <span class="sw-label">{{ enabled === 1 ? '启用中' : '已停用' }}</span>
          <el-switch v-model="enabled" :active-value="1" :inactive-value="0" @change="toggleEnabled" />
          <el-button size="small" plain @click="useDefaultContent">填入默认</el-button>
          <el-button size="small" plain @click="resetDefault">恢复默认</el-button>
          <el-button size="small" type="primary" :loading="saving" :disabled="!dirty" @click="save">
            保存
          </el-button>
        </div>
      </header>

      <p class="rm-note">{{ current.description }}</p>

      <el-input
        v-model="draft"
        type="textarea"
        :rows="10"
        resize="none"
        class="rm-editor"
        placeholder="这里写系统提示词，AI 每次回答前都会读到它"
      />
      <div class="rm-meta">
        <span>{{ draft.length }} 字</span>
        <span v-if="dirty" class="dirty">有未保存的修改</span>
        <span v-else>已同步到线上</span>
      </div>

      <!-- 试跑对比 -->
      <div class="trial">
        <div class="trial-head">
          <h4>试跑对比</h4>
          <span class="trial-hint">
            同一条问题，分别用<em>系统默认</em>与<em>当前规则</em>回答，保存前就能看到差别
          </span>
        </div>
        <div class="trial-bar">
          <el-input
            v-model="trialQuestion"
            placeholder="输入一条真实的用户问题，例如：这单为什么还没发货？"
            clearable
            @keyup.enter="runTrial"
          />
          <el-button type="primary" :loading="trialing" :disabled="dirty" @click="runTrial">
            开始对比
          </el-button>
        </div>
        <p v-if="dirty" class="trial-warn">规则有未保存的修改，先保存再试跑才能对比到新内容</p>
        <p v-if="needsProduct && !dirty" class="trial-warn plain">
          商品导购规则会用「咨询量最高的在售商品」作为真实上下文，避免两边都缺资料
        </p>

        <p v-if="verdict" class="verdict">{{ verdict }}</p>

        <div v-if="trial" class="trial-grid">
          <article class="trial-card">
            <div class="tc-head">
              <span class="tc-tag">系统默认</span>
              <span class="tc-ms">{{ trial.base.ms }}ms</span>
            </div>
            <p class="tc-body">{{ trial.base.text || '（空回答）' }}</p>
            <el-collapse class="tc-prompt">
              <el-collapse-item title="查看使用的提示词" :name="1">
                <pre>{{ trial.base.prompt }}</pre>
              </el-collapse-item>
            </el-collapse>
          </article>

          <article class="trial-card accent">
            <div class="tc-head">
              <span class="tc-tag on">当前规则</span>
              <span class="tc-ms">{{ trial.active.ms }}ms</span>
            </div>
            <p class="tc-body">{{ trial.active.text || '（空回答）' }}</p>
            <el-collapse class="tc-prompt">
              <el-collapse-item title="查看使用的提示词" :name="1">
                <pre>{{ trial.active.prompt }}</pre>
              </el-collapse-item>
            </el-collapse>
          </article>
        </div>
      </div>
    </section>

    <section v-else class="rule-main empty">
      <el-empty v-if="!loading" description="还没有可配置的规则" />
    </section>
  </div>
</template>

<style scoped>
.rules-page {
  display: flex;
  gap: 16px;
  height: 100%;
  min-height: 0;
}

/* ===== 左：规则清单 ===== */
.rule-list {
  width: 292px;
  flex: none;
  border: 1px solid var(--border-1);
  border-radius: var(--radius-card);
  background: #fff;
  padding: 16px 12px;
  overflow-y: auto;
}

.rl-head {
  padding: 0 8px 14px;
}

.rl-head h2 {
  margin: 0 0 5px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.2px;
  color: var(--text-1);
}

.rl-head p {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-3);
}

.rule-item {
  display: block;
  width: 100%;
  text-align: left;
  font-family: inherit;
  background: none;
  border: none;
  border-radius: 13px;
  padding: 10px 12px;
  margin-bottom: 2px;
  cursor: pointer;
  transition: background-color 0.2s var(--ease-ios), transform 0.2s var(--ease-ios);
}

.rule-item:hover {
  background: var(--fill-2);
}

.rule-item:active {
  transform: scale(0.985);
}

.rule-item.on {
  background: var(--brand-soft);
}

.ri-top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ri-name {
  flex: 1;
  min-width: 0;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text-1);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ri-dot {
  width: 6px;
  height: 6px;
  flex: none;
  border-radius: 50%;
  background: #34c759;
}

.ri-dot.off {
  background: #d2d2d7;
}

.ri-desc {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--text-3);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ===== 右：编辑器 ===== */
.rule-main {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--border-1);
  border-radius: var(--radius-card);
  background: #fff;
  padding: 20px 24px 24px;
  overflow-y: auto;
}

.rule-main.empty {
  display: flex;
  align-items: center;
  justify-content: center;
}

.rm-head {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.rm-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  min-width: 0;
}

.rm-title h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.3px;
  color: var(--text-1);
}

.rm-title code {
  font-family: ui-monospace, 'SF Mono', Consolas, monospace;
  font-size: 11px;
  letter-spacing: 0.04em;
  color: var(--text-3);
  background: var(--fill-2);
  padding: 2px 7px;
  border-radius: 5px;
}

.rm-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}

.sw-label {
  font-size: 12.5px;
  color: var(--text-3);
}

.rm-note {
  margin: 10px 0 14px;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--text-3);
}

.rm-editor :deep(.el-textarea__inner) {
  font-family: ui-monospace, 'SF Mono', Consolas, Monaco, monospace;
  font-size: 13px;
  line-height: 1.75;
  padding: 14px 16px;
  border-radius: 14px;
  background: #fbfbfd;
  box-shadow: inset 0 0 0 1px var(--border-1);
}

.rm-editor :deep(.el-textarea__inner:focus) {
  background: #fff;
  box-shadow: inset 0 0 0 1px var(--text-1) !important;
}

.rm-meta {
  display: flex;
  gap: 14px;
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-3);
}

.rm-meta .dirty {
  color: #b26a00;
}

/* ===== 试跑对比 ===== */
.trial {
  margin-top: 26px;
  padding-top: 20px;
  border-top: 1px solid var(--border-1);
}

.trial-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}

.trial-head h4 {
  margin: 0;
  font-size: 14.5px;
  font-weight: 600;
  letter-spacing: -0.2px;
  color: var(--text-1);
}

.trial-hint {
  font-size: 12.5px;
  color: var(--text-3);
}

.trial-hint em {
  font-style: normal;
  color: var(--text-1);
}

.trial-bar {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.trial-bar .el-button {
  height: 40px;
  border-radius: 12px;
  padding: 0 20px;
}

.trial-warn {
  margin: 8px 0 0;
  font-size: 12px;
  color: #b26a00;
}

.trial-warn.plain {
  color: var(--text-3);
}

.verdict {
  margin: 14px 0 0;
  font-size: 13px;
  color: var(--text-1);
  background: var(--brand-soft);
  border-radius: 10px;
  padding: 9px 13px;
}

.trial-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 12px;
}

@media (max-width: 1180px) {
  .trial-grid {
    grid-template-columns: 1fr;
  }
}

.trial-card {
  border: 1px solid var(--border-1);
  border-radius: 14px;
  padding: 12px 14px 6px;
  background: #fff;
  animation: card-in 0.36s var(--ease-ios) both;
}

.trial-card.accent {
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.18);
}

@keyframes card-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.tc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.tc-tag {
  font-size: 10.5px;
  letter-spacing: 0.1em;
  color: var(--text-3);
  background: var(--fill-2);
  border-radius: 999px;
  padding: 3px 10px;
}

.tc-tag.on {
  color: #fff;
  background: var(--brand);
}

.tc-ms {
  font-size: 11px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
}

.tc-body {
  margin: 0 0 10px;
  font-size: 13.5px;
  line-height: 1.68;
  color: var(--text-1);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 320px;
  overflow-y: auto;
}

.tc-prompt :deep(.el-collapse) {
  border: none;
}

.tc-prompt :deep(.el-collapse-item__header) {
  height: 34px;
  font-size: 12px;
  color: var(--text-3);
  border-bottom: none;
  background: none;
}

.tc-prompt :deep(.el-collapse-item__wrap) {
  border-bottom: none;
  background: none;
}

.tc-prompt :deep(.el-collapse-item__content) {
  padding-bottom: 8px;
}

.tc-prompt pre {
  margin: 0;
  font-family: ui-monospace, 'SF Mono', Consolas, Monaco, monospace;
  font-size: 11.5px;
  line-height: 1.65;
  color: var(--text-2);
  background: #fbfbfd;
  border-radius: 10px;
  padding: 10px 12px;
  max-height: 220px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
