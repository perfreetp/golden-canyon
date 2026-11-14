<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import ModalDialog from '@/components/ModalDialog.vue'
import { buildDocNo, buildRoomArchiveNo, makeDrawing, makeRoom } from '@/data/factory'
import type { Campus, Drawing, Floor, Room } from '@/types'

const store = useAppStore()
const router = useRouter()

const expanded = ref<Record<string, boolean>>({})
const toggle = (id: string) => (expanded.value[id] = !expanded.value[id])

// 视图可能在 store 数据就绪后才挂载（App 以 loaded 控制 RouterView），用 watch 保证展开生效
watch(
  () => [store.campuses.length, store.floors.length],
  () => {
    for (const c of store.campuses) expanded.value[c.id] = true
    for (const f of store.floors) expanded.value[f.id] = true
  },
  { immediate: true },
)

const dlg = ref<'' | 'campus' | 'floor' | 'room' | 'drawing'>('')
const editing = ref<{ campus?: Campus; floor?: Floor; room?: Room }>({})

const campusForm = ref({ code: '', name: '', address: '' })
const floorForm = ref({ code: '', name: '' })
const roomForm = ref({ roomNo: '', name: '', w: 12000, h: 7000 })
const drawingForm = ref({ title: '', stage: 'before' as Drawing['stage'], year: new Date().getFullYear() })

const selectedRoom = ref<Room | null>(null)

function openCampus() {
  editing.value = {}
  campusForm.value = { code: '', name: '', address: '' }
  dlg.value = 'campus'
}
function openFloor(campus: Campus) {
  editing.value = { campus }
  floorForm.value = { code: '', name: '' }
  dlg.value = 'floor'
}
function openRoom(floor: Floor) {
  editing.value = { floor }
  roomForm.value = { roomNo: '', name: '', w: 12000, h: 7000 }
  dlg.value = 'room'
}
function openDrawing(room: Room) {
  selectedRoom.value = room
  drawingForm.value = {
    title: `${room.name}工艺布局图`,
    stage: 'before',
    year: new Date().getFullYear(),
  }
  dlg.value = 'drawing'
}

async function saveCampus() {
  const c: Campus = {
    id: editing.value.campus?.id ?? `campus-${Date.now()}`,
    code: campusForm.value.code.trim(),
    name: campusForm.value.name.trim(),
    address: campusForm.value.address.trim(),
    createdAt: editing.value.campus?.createdAt ?? Date.now(),
  }
  await store.saveCampus(c)
  dlg.value = ''
}

async function saveFloor() {
  const campus = editing.value.campus!
  const f: Floor = {
    id: editing.value.floor?.id ?? `floor-${Date.now()}`,
    campusId: campus.id,
    code: floorForm.value.code.trim(),
    name: floorForm.value.name.trim(),
    bounds: { x: 0, y: 0, w: 50000, h: 20000 },
    createdAt: editing.value.floor?.createdAt ?? Date.now(),
  }
  await store.saveFloor(f)
  expanded.value[campus.id] = true
  dlg.value = ''
}

async function saveRoom() {
  const floor = editing.value.floor!
  const campus = store.campuses.find((c) => c.id === floor.campusId)!
  const room = makeRoom({
    id: editing.value.room?.id,
    floorId: floor.id,
    campusId: campus.id,
    roomNo: roomForm.value.roomNo.trim(),
    name: roomForm.value.name.trim(),
    bounds: { x: 0, y: 0, w: roomForm.value.w, h: roomForm.value.h },
  })
  room.archiveNo = buildRoomArchiveNo(campus.code, floor.code, room.roomNo, store.roomsByFloor(floor.id).length + 1)
  await store.saveRoom(room)
  expanded.value[floor.id] = true
  dlg.value = ''
}

async function saveDrawing() {
  const room = selectedRoom.value!
  const campus = store.campuses.find((c) => c.id === room.campusId)!
  const floor = store.floors.find((f) => f.id === room.floorId)!
  const seq = store.drawingsByRoom(room.id).length + 1
  const d = makeDrawing({
    roomId: room.id,
    floorId: floor.id,
    campusId: campus.id,
    docNo: buildDocNo(campus.code, floor.code, room.roomNo, drawingForm.value.year, seq),
    title: drawingForm.value.title.trim() || '未命名工艺布局图',
    stage: drawingForm.value.stage,
    renovationYear: drawingForm.value.year,
  })
  await store.persistDrawing(d)
  dlg.value = ''
  router.push({ name: 'editor', params: { drawingId: d.id } })
}

const stageLabel = computed<Record<Drawing['stage'], string>>(() => ({
  before: '改造前',
  scheme: '方案',
  asbuilt: '竣工',
}))

function openEditor(d: Drawing) {
  store.selectContext(d.campusId, d.floorId, d.roomId, d.id)
  router.push({ name: 'editor', params: { drawingId: d.id } })
}

async function removeRoom(r: Room) {
  if (store.drawingsByRoom(r.id).length || store.photosByRoom(r.id).length) {
    alert('该房间下存在图档或照片档案，请先删除后再移除房间。')
    return
  }
  if (confirm(`确认删除房间 ${r.roomNo}？`)) await store.deleteRoom(r.id)
}
</script>

<template>
  <div class="page">
    <div class="head">
      <div>
        <h2>院区 / 楼层 / 房间建档</h2>
        <p class="muted">按行政层级挂载洗消间，房间建立后可在图档加工中绘制分层平面图。</p>
      </div>
      <button class="primary" @click="openCampus">＋ 新增院区</button>
    </div>

    <div class="tree panel">
      <div v-for="c in store.campuses" :key="c.id" class="lv1">
        <div class="row campus" @click="toggle(c.id)">
          <span class="caret">{{ expanded[c.id] ? '▾' : '▸' }}</span>
          <span class="ico">🏥</span>
          <b>{{ c.name }}</b>
          <span class="tag">{{ c.code }}</span>
          <span class="muted addr">{{ c.address }}</span>
          <span class="spacer" />
          <button @click.stop="openFloor(c)">＋ 楼层</button>
        </div>

        <template v-if="expanded[c.id]">
          <div v-for="f in store.floorsByCampus(c.id)" :key="f.id" class="lv2">
            <div class="row floor" @click="toggle(f.id)">
              <span class="caret">{{ expanded[f.id] ? '▾' : '▸' }}</span>
              <span class="ico">🏬</span>
              <b>{{ f.name }}</b>
              <span class="tag">{{ f.code }}</span>
              <span class="spacer" />
              <button @click.stop="openRoom(f)">＋ 房间</button>
            </div>

            <template v-if="expanded[f.id]">
              <div v-for="r in store.roomsByFloor(f.id)" :key="r.id" class="lv3">
                <div class="row room">
                  <span class="ico">🚪</span>
                  <b>{{ r.roomNo }}</b>
                  <span>{{ r.name }}</span>
                  <span class="tag">建档号 {{ r.archiveNo }}</span>
                  <span v-if="r.lastMaintenanceDate" class="tag ok">
                    最近检修 {{ r.lastMaintenanceDate }}
                  </span>
                  <span class="spacer" />
                  <button @click="openDrawing(r)">＋ 新建图档</button>
                  <button class="danger" @click="removeRoom(r)">删除</button>
                </div>
                <div v-for="d in store.drawingsByRoom(r.id)" :key="d.id" class="lv4">
                  <div class="row drawing" @click="openEditor(d)">
                    <span class="ico">📐</span>
                    <span class="docno">{{ d.docNo }}</span>
                    <span>{{ d.title }}</span>
                    <span class="tag">{{ stageLabel[d.stage] }}</span>
                    <span class="tag">V{{ d.version }}</span>
                    <span class="tag" :class="d.archived ? 'ok' : 'warn'">
                      {{ d.archived ? '已归档' : '在制' }}
                    </span>
                    <span v-if="d.entities.length" class="muted">{{ d.entities.length }} 图元</span>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </template>
      </div>
      <div v-if="!store.campuses.length" class="empty muted">暂无院区，点击右上角「新增院区」开始建档。</div>
    </div>

    <!-- 院区弹窗 -->
    <ModalDialog v-if="dlg === 'campus'" title="新增院区" @close="dlg = ''">
      <div class="form">
        <label>院区编码 <input v-model="campusForm.code" placeholder="如 ZY / DF" /></label>
        <label>院区名称 <input v-model="campusForm.name" placeholder="如 总院" /></label>
        <label>地址 <input v-model="campusForm.address" placeholder="选填" /></label>
      </div>
      <template #footer>
        <button @click="dlg = ''">取消</button>
        <button class="primary" :disabled="!campusForm.code || !campusForm.name" @click="saveCampus">保存</button>
      </template>
    </ModalDialog>

    <!-- 楼层弹窗 -->
    <ModalDialog v-if="dlg === 'floor'" :title="`新增楼层 · ${editing.campus?.name}`" @close="dlg = ''">
      <div class="form">
        <label>楼层编码 <input v-model="floorForm.code" placeholder="如 F3" /></label>
        <label>楼层名称 <input v-model="floorForm.name" placeholder="如 门诊综合楼三层" /></label>
      </div>
      <template #footer>
        <button @click="dlg = ''">取消</button>
        <button class="primary" :disabled="!floorForm.code || !floorForm.name" @click="saveFloor">保存</button>
      </template>
    </ModalDialog>

    <!-- 房间弹窗 -->
    <ModalDialog v-if="dlg === 'room'" :title="`新增房间 · ${editing.floor?.name}`" @close="dlg = ''">
      <div class="form">
        <label>房间号 <input v-model="roomForm.roomNo" placeholder="如 3F-NJ-08" /></label>
        <label>房间名称 <input v-model="roomForm.name" placeholder="如 消化内镜中心洗消间" /></label>
        <div class="flex gap8">
          <label class="flex1">房间净宽 (mm) <input type="number" v-model.number="roomForm.w" min="1000" /></label>
          <label class="flex1">房间净高 (mm) <input type="number" v-model.number="roomForm.h" min="1000" /></label>
        </div>
      </div>
      <template #footer>
        <button @click="dlg = ''">取消</button>
        <button class="primary" :disabled="!roomForm.roomNo || !roomForm.name" @click="saveRoom">保存建档</button>
      </template>
    </ModalDialog>

    <!-- 图档弹窗 -->
    <ModalDialog v-if="dlg === 'drawing'" :title="`新建工艺布局图 · ${selectedRoom?.roomNo}`" @close="dlg = ''">
      <div class="form">
        <label>图档名称 <input v-model="drawingForm.title" /></label>
        <div class="flex gap8">
          <label class="flex1">
            改造阶段
            <select v-model="drawingForm.stage">
              <option value="before">改造前建档</option>
              <option value="scheme">方案设计</option>
              <option value="asbuilt">竣工图</option>
            </select>
          </label>
          <label class="flex1">改造年份 <input type="number" v-model.number="drawingForm.year" /></label>
        </div>
        <p class="muted hint">保存后进入图档加工工作台，可绘制清洗槽、消毒槽、干燥台、储镜柜、污物通道与洁污流线。</p>
      </div>
      <template #footer>
        <button @click="dlg = ''">取消</button>
        <button class="primary" @click="saveDrawing">创建并打开</button>
      </template>
    </ModalDialog>
  </div>
</template>

<style scoped>
.page {
  padding: 20px 24px;
  height: 100%;
  overflow: auto;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 14px;
}
h2 {
  margin: 0 0 4px;
  font-size: 18px;
}
.tree {
  padding: 8px 0;
}
.row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  cursor: default;
  border-bottom: 1px solid #f0f2f5;
}
.row.campus {
  font-size: 15px;
  cursor: pointer;
}
.row.floor {
  cursor: pointer;
}
.row.drawing {
  cursor: pointer;
}
.row.drawing:hover {
  background: #f0f6fc;
}
.lv2 {
  margin-left: 26px;
}
.lv3 {
  margin-left: 26px;
}
.lv4 {
  margin-left: 26px;
}
.caret {
  width: 14px;
  color: #7a8699;
}
.spacer {
  flex: 1;
}
.addr {
  font-size: 12px;
}
.docno {
  font-family: Consolas, monospace;
  font-size: 12.5px;
  color: var(--c-primary);
  font-weight: 600;
}
.empty {
  padding: 40px;
  text-align: center;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.form label {
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 13px;
  color: var(--c-text-2);
}
.flex1 {
  flex: 1;
}
.hint {
  font-size: 12px;
  margin: 4px 0 0;
}
button {
  padding: 4px 10px;
  font-size: 12.5px;
}
</style>
