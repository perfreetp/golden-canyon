<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import DrawingCanvas from '@/components/DrawingCanvas.vue'
import LayerPanel from '@/components/LayerPanel.vue'
import PropertyPanel from '@/components/PropertyPanel.vue'
import ModalDialog from '@/components/ModalDialog.vue'
import type { RenderStats } from '@/render/renderer'
import type { DrawingEntity } from '@/types'

const route = useRoute()
const router = useRouter()
const store = useAppStore()

const drawingId = route.params.drawingId as string
const drawing = computed(() => store.drawings.find((d) => d.id === drawingId))
const selectedId = ref<string | null>(null)
const tool = ref('select')
const dirty = ref(false)
const stats = shallowRef<RenderStats | null>(null)
const crossingCount = ref(0)
const saveDlg = ref(false)
const changeNote = ref('')
const saving = ref(false)
const toast = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined
function showToast(msg: string) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 3200)
}

const canvasRef = shallowRef<InstanceType<typeof DrawingCanvas> | null>(null)

const tools = [
  { key: 'select', label: '选择', icon: '🖱' },
  { key: 'pan', label: '平移', icon: '✋' },
  { key: 'wash-sink', label: '清洗槽', icon: '🟦' },
  { key: 'disinfect-tank', label: '消毒槽', icon: '🟪' },
  { key: 'dry-bench', label: '干燥台', icon: '🟩' },
  { key: 'scope-cabinet', label: '储镜柜', icon: '🟨' },
  { key: 'dirt-zone', label: '污物通道', icon: '🟥' },
  { key: 'flow-clean', label: '清洁流线', icon: '🟢' },
  { key: 'flow-dirt', label: '污物流线', icon: '🔴' },
  { key: 'wall', label: '墙体', icon: '▤' },
  { key: 'door', label: '门', icon: '🚪' },
  { key: 'room-outline', label: '房间轮廓', icon: '⬜' },
  { key: 'label', label: '标注', icon: '🔤' },
]

const selectedEntity = computed<DrawingEntity | null>(
  () => drawing.value?.entities.find((e) => e.id === selectedId.value) ?? null,
)

const room = computed(() => (drawing.value ? store.rooms.find((r) => r.id === drawing.value!.roomId) : null))
const versions = computed(() => store.versionsOfDrawing(drawingId))

function onStats(s: RenderStats) {
  stats.value = s
  crossingCount.value = canvasRef.value?.getCrossingCount() ?? 0
}

function onCanvasChange() {
  dirty.value = true
  crossingCount.value = canvasRef.value?.getCrossingCount() ?? 0
}

async function quickSave() {
  if (!drawing.value) return
  await store.persistDrawing(drawing.value)
  dirty.value = false
}

function openCommit() {
  changeNote.value = ''
  saveDlg.value = true
}

async function commitVersion() {
  if (!drawing.value || saving.value) return
  saving.value = true
  try {
    const v = await store.commitVersion(drawing.value, changeNote.value.trim() || '未填写变更说明')
    dirty.value = false
    saveDlg.value = false
    showToast(`已提交版本 V${v}，可在版本中心与历史版本逐项比对。`)
  } finally {
    saving.value = false
  }
}

async function toggleArchive() {
  if (!drawing.value) return
  if (dirty.value) {
    alert('存在未保存修改，请先保存或提交版本后再归档。')
    return
  }
  if (drawing.value.archived) {
    await store.unarchiveDrawing(drawing.value)
  } else {
    if (confirm('归档后图档将进入归档检索库（仍可取消归档）。确认归档？')) {
      await store.archiveDrawing(drawing.value)
    }
  }
}

const stageLabel: Record<string, string> = { before: '改造前建档', scheme: '方案设计', asbuilt: '竣工图' }
</script>

<template>
  <div v-if="drawing" class="editor" tabindex="0">
    <!-- 顶部工具条 -->
    <header class="topbar panel">
      <div class="doc">
        <button @click="router.push('/archive-tree')">← 返回建档树</button>
        <div>
          <b>{{ drawing.title }}</b>
          <div class="meta">
            <code>{{ drawing.docNo }}</code>
            <span class="tag">{{ stageLabel[drawing.stage] }}</span>
            <span class="tag">V{{ drawing.version }}</span>
            <span class="tag" :class="drawing.archived ? 'ok' : 'warn'">
              {{ drawing.archived ? '已归档' : '在制' }}
            </span>
            <span v-if="dirty" class="tag danger">未保存</span>
            <span v-if="room" class="muted">{{ room.roomNo }} {{ room.name }}</span>
          </div>
        </div>
      </div>
      <div class="actions">
        <button @click="canvasRef?.zoom(1/1.3)">－</button>
        <button @click="canvasRef?.zoom(1.3)">＋</button>
        <button @click="canvasRef?.frameAll()">全图</button>
        <button :disabled="!dirty" @click="quickSave">保存</button>
        <button class="primary" @click="openCommit">提交新版本</button>
        <button @click="router.push({ name: 'versions', params: { drawingId } })">版本中心 ({{ versions.length }})</button>
        <button :class="drawing.archived ? '' : 'danger'" @click="toggleArchive">
          {{ drawing.archived ? '取消归档' : '归档' }}
        </button>
      </div>
    </header>

    <div class="body">
      <!-- 左侧工具 -->
      <aside class="toolbox panel">
        <button
          v-for="t in tools"
          :key="t.key"
          :class="{ active: tool === t.key }"
          @click="tool = t.key"
          :title="t.label"
        >
          <span class="icon">{{ t.icon }}</span>
          <span>{{ t.label }}</span>
        </button>
        <div class="tip muted">
          <p>滚轮缩放 · 中键/空格拖拽平移</p>
          <p>选择后方向键微调（Shift 加速），R 旋转 90°</p>
          <p>画线：单击加点，双击/Enter 完成</p>
        </div>
      </aside>

      <!-- 画布 -->
      <DrawingCanvas
        ref="canvasRef"
        :drawing="drawing"
        :selected-id="selectedId"
        :tool="tool"
        @select="selectedId = $event"
        @change="onCanvasChange"
        @stats="onStats"
      />

      <!-- 右侧面板 -->
      <aside class="right panel scroll">
        <div v-if="crossingCount" class="cross-banner">
          ⚠ 检测到 <b>{{ crossingCount }}</b> 处洁污流线交叉，已在图中自动标红，请调整流线或增设物理隔断。
        </div>
        <div v-else class="ok-banner">✓ 未检测到洁污流线交叉，满足洁污分流要求。</div>

        <LayerPanel :drawing="drawing" @change="canvasRef?.refresh(); dirty = true" />

        <div class="divider" />
        <PropertyPanel
          :drawing="drawing"
          :entity="selectedEntity"
          @change="onCanvasChange"
          @close="selectedId = null"
        />
      </aside>
    </div>

    <ModalDialog v-if="saveDlg" title="提交新版本" @close="saveDlg = false">      <div class="form">
        <p class="muted">
          系统将对当前图档生成只读快照（V{{ drawing.version + 1 }}），之后可在版本中心与任意历史版本逐项比对并导出说明报告。
        </p>
        <label>本次变更说明
          <textarea v-model="changeNote" rows="4" placeholder="如：污物通道东移 1.2m，消除洁污流线交叉点 2 处；新增储镜柜 1 组。" />
        </label>
      </div>
      <template #footer>
        <button @click="saveDlg = false">取消</button>
        <button class="primary" :disabled="saving" @click="commitVersion">确认提交</button>
      </template>
    </ModalDialog>

    <Transition name="toast">
      <div v-if="toast" class="toast">✓ {{ toast }}</div>
    </Transition>
  </div>
  <div v-else class="notfound">
    图档不存在或已被删除。
    <button @click="router.push('/archive-tree')">返回建档树</button>
  </div>
</template>

<style scoped>
.editor {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 10px 14px;
  gap: 10px;
  outline: none;
}
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  gap: 12px;
  flex-shrink: 0;
}
.doc {
  display: flex;
  gap: 12px;
  align-items: center;
}
.meta {
  display: flex;
  gap: 7px;
  align-items: center;
  margin-top: 3px;
  font-size: 12px;
}
.meta code {
  font-size: 11.5px;
  color: var(--c-primary);
}
.actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.body {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 10px;
}
.toolbox {
  width: 92px;
  flex-shrink: 0;
  padding: 8px 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: auto;
}
.toolbox button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 7px 2px;
  font-size: 11.5px;
  border-radius: 6px;
}
.toolbox button.active {
  background: var(--c-primary);
  border-color: var(--c-primary);
  color: #fff;
}
.icon {
  font-size: 17px;
}
.tip {
  font-size: 11px;
  line-height: 1.7;
  margin-top: auto;
  padding: 8px 4px;
}
.tip p {
  margin: 4px 0;
}
.right {
  width: 310px;
  flex-shrink: 0;
  padding: 12px;
  overflow: auto;
}
.cross-banner {
  background: #fbe5e2;
  border: 1px solid #eec3bd;
  color: var(--c-danger);
  border-radius: 6px;
  padding: 9px 11px;
  font-size: 12.5px;
  line-height: 1.7;
  margin-bottom: 10px;
}
.ok-banner {
  background: #e3f4ea;
  color: var(--c-ok);
  border-radius: 6px;
  padding: 9px 11px;
  font-size: 12.5px;
  margin-bottom: 10px;
}
.divider {
  height: 1px;
  background: var(--c-border);
  margin: 14px 0;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.form label {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 13px;
  color: var(--c-text-2);
}
.notfound {
  margin: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  color: var(--c-text-2);
}
.toast {
  position: fixed;
  top: 70px;
  left: 50%;
  transform: translateX(-50%);
  background: #1f2a3a;
  color: #fff;
  padding: 10px 22px;
  border-radius: 8px;
  font-size: 13.5px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
  z-index: 200;
}
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.25s, transform 0.25s;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-8px);
}
</style>
