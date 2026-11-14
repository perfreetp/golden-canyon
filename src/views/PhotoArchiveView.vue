<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { nanoid } from 'nanoid'
import { useAppStore } from '@/stores/app'
import ModalDialog from '@/components/ModalDialog.vue'
import { fileToBlob, makeThumbDataUrl } from '@/data/image'
import type { PhotoRecord, Room } from '@/types'

const store = useAppStore()
const route = useRoute()
const router = useRouter()

const selectedRoomId = ref<string>((route.params.roomId as string) ?? store.currentRoomId ?? '')
const filterCampus = ref('')
const filterFloor = ref('')

const uploadDlg = ref(false)
const preview = ref<PhotoRecord | null>(null)
const previewUrl = ref('')
const form = ref({ title: '', category: 'site-photo' as PhotoRecord['category'], takenAt: new Date().toISOString().slice(0, 10), remark: '' })
const pendingFiles = ref<File[]>([])

const rooms = computed<Room[]>(() =>
  store.rooms
    .filter((r) => !filterCampus.value || r.campusId === filterCampus.value)
    .filter((r) => !filterFloor.value || r.floorId === filterFloor.value),
)

const currentRoom = computed(() => store.rooms.find((r) => r.id === selectedRoomId.value) ?? null)
const currentPhotos = computed(() =>
  selectedRoomId.value ? store.photosByRoom(selectedRoomId.value) : [],
)

function roomName(id: string): string {
  const r = store.rooms.find((x) => x.id === id)
  return r ? `${r.roomNo} ${r.name}` : id
}

function onFiles(e: Event) {
  const input = e.target as HTMLInputElement
  pendingFiles.value = input.files ? Array.from(input.files) : []
  if (pendingFiles.value[0] && !form.value.title) {
    form.value.title = pendingFiles.value[0].name.replace(/\.[^.]+$/, '')
  }
}

async function doUpload() {
  const room = currentRoom.value
  if (!room || !pendingFiles.value.length) return
  const campus = store.campuses.find((c) => c.id === room.campusId)!
  const floor = store.floors.find((f) => f.id === room.floorId)!
  const baseSeq = currentPhotos.value.length
  for (let i = 0; i < pendingFiles.value.length; i++) {
    const file = pendingFiles.value[i]
    const blob = await fileToBlob(file)
    const thumbDataUrl = await makeThumbDataUrl(file)
    const seq = baseSeq + i + 1
    const record: PhotoRecord = {
      id: nanoid(10),
      roomId: room.id,
      campusId: room.campusId,
      floorId: room.floorId,
      archiveNo: `${campus.code}-${floor.code}-${room.roomNo}-P-${String(seq).padStart(2, '0')}`,
      title: pendingFiles.value.length > 1 ? `${form.value.title}（${i + 1}）` : form.value.title || file.name,
      category: form.value.category,
      takenAt: form.value.takenAt,
      thumbDataUrl,
      blobKey: nanoid(16),
      mime: file.type || 'image/jpeg',
      size: blob.size,
      remark: form.value.remark,
      createdAt: Date.now(),
    }
    await store.savePhoto(record, blob)
  }
  uploadDlg.value = false
  pendingFiles.value = []
  form.value = { title: '', category: 'site-photo', takenAt: new Date().toISOString().slice(0, 10), remark: '' }
}

async function openPreview(p: PhotoRecord) {
  preview.value = p
  const blob = await store.getPhotoBlob(p.blobKey)
  previewUrl.value = blob ? URL.createObjectURL(blob) : p.thumbDataUrl
}

function closePreview() {
  if (previewUrl.value.startsWith('blob:')) URL.revokeObjectURL(previewUrl.value)
  preview.value = null
}

async function remove(p: PhotoRecord) {
  if (confirm(`确认删除照片档案 ${p.archiveNo}？`)) await store.deletePhoto(p.id)
}

const catLabel: Record<PhotoRecord['category'], string> = {
  'site-photo': '现场照片',
  'drawing-scan': '图纸扫描',
  other: '其他',
}
</script>

<template>
  <div class="page">
    <div class="head">
      <div>
        <h2>改造前图纸 / 现场照片建档</h2>
        <p class="muted">照片与扫描件按房间挂接并统一编号，原图保存在本机 IndexedDB。</p>
      </div>
    </div>

    <div class="layout">
      <div class="panel room-list scroll">
        <div class="filters">
          <select v-model="filterCampus">
            <option value="">全部院区</option>
            <option v-for="c in store.campuses" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
          <select v-model="filterFloor">
            <option value="">全部楼层</option>
            <option v-for="f in store.floors.filter(x => !filterCampus || x.campusId === filterCampus)" :key="f.id" :value="f.id">
              {{ f.name }}
            </option>
          </select>
        </div>
        <div
          v-for="r in rooms"
          :key="r.id"
          class="room-item"
          :class="{ active: r.id === selectedRoomId }"
          @click="selectedRoomId = r.id"
        >
          <b>{{ r.roomNo }}</b>
          <span class="muted">{{ r.name }}</span>
          <span class="tag">{{ store.photosByRoom(r.id).length }} 份</span>
        </div>
      </div>

      <div class="content panel">
        <template v-if="currentRoom">
          <div class="content-head">
            <div>
              <b>{{ roomName(currentRoom.id) }}</b>
              <span class="tag" style="margin-left: 8px">建档号 {{ currentRoom.archiveNo }}</span>
            </div>
            <div class="flex gap8">
              <button @click="router.back()">返回</button>
              <button class="primary" @click="uploadDlg = true">＋ 上传照片/扫描件</button>
            </div>
          </div>

          <div v-if="!currentPhotos.length" class="empty muted">
            该房间暂无改造前档案，点击右上角上传现场照片或图纸扫描件。
          </div>
          <div v-else class="grid">
            <div v-for="p in currentPhotos" :key="p.id" class="card" @click="openPreview(p)">
              <div class="thumb"><img :src="p.thumbDataUrl" :alt="p.title" /></div>
              <div class="info">
                <b>{{ p.title }}</b>
                <div class="meta">
                  <span class="tag">{{ catLabel[p.category] }}</span>
                  <span class="muted">{{ p.takenAt }}</span>
                </div>
                <code>{{ p.archiveNo }}</code>
                <div class="ops">
                  <button class="danger" @click.stop="remove(p)">删除</button>
                </div>
              </div>
            </div>
          </div>
        </template>
        <div v-else class="empty muted">请先在左侧选择一个房间。</div>
      </div>
    </div>

    <ModalDialog v-if="uploadDlg" title="上传改造前档案" width="560px" @close="uploadDlg = false">
      <div class="form">
        <label>选择文件（可多选，图片或 PDF 扫描件）
          <input type="file" accept="image/*" multiple @change="onFiles" />
        </label>
        <label>档案标题 <input v-model="form.title" placeholder="如 清洗槽区现状照" /></label>
        <div class="flex gap8">
          <label class="flex1">
            类别
            <select v-model="form.category">
              <option value="site-photo">现场照片</option>
              <option value="drawing-scan">图纸扫描件</option>
              <option value="other">其他</option>
            </select>
          </label>
          <label class="flex1">拍摄/出图日期 <input type="date" v-model="form.takenAt" /></label>
        </div>
        <label>备注 <textarea v-model="form.remark" rows="2" placeholder="选填" /></label>
      </div>
      <template #footer>
        <button @click="uploadDlg = false">取消</button>
        <button class="primary" :disabled="!pendingFiles.length" @click="doUpload">
          上传 {{ pendingFiles.length ? `(${pendingFiles.length} 个文件)` : '' }}
        </button>
      </template>
    </ModalDialog>

    <ModalDialog v-if="preview" :title="preview.title" @close="closePreview">
      <img v-if="preview.mime.startsWith('image')" :src="previewUrl" class="preview-img" />
      <table class="data" style="margin-top: 12px">
        <tr><th style="width: 130px">建档编号</th><td>{{ preview.archiveNo }}</td></tr>
        <tr><th>类别</th><td>{{ catLabel[preview.category] }}</td></tr>
        <tr><th>日期</th><td>{{ preview.takenAt }}</td></tr>
        <tr><th>文件大小</th><td>{{ (preview.size / 1024).toFixed(1) }} KB</td></tr>
        <tr v-if="preview.remark"><th>备注</th><td>{{ preview.remark }}</td></tr>
      </table>
    </ModalDialog>
  </div>
</template>

<style scoped>
.page {
  padding: 20px 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
h2 {
  margin: 0 0 4px;
  font-size: 18px;
}
.layout {
  flex: 1;
  display: flex;
  gap: 14px;
  min-height: 0;
}
.room-list {
  width: 280px;
  flex-shrink: 0;
  padding: 10px;
}
.filters {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
}
.room-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 9px 10px;
  border-radius: 6px;
  cursor: pointer;
}
.room-item:hover {
  background: #f2f6fb;
}
.room-item.active {
  background: #e4eef9;
  outline: 1px solid #b9d3ee;
}
.content {
  flex: 1;
  min-width: 0;
  padding: 14px 18px;
  overflow: auto;
}
.content-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 14px;
}
.card {
  border: 1px solid var(--c-border);
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.15s;
}
.card:hover {
  box-shadow: var(--shadow);
}
.thumb {
  height: 150px;
  background: #eceff3;
  display: flex;
  align-items: center;
  justify-content: center;
}
.thumb img {
  max-width: 100%;
  max-height: 100%;
}
.info {
  padding: 9px 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.info code {
  font-size: 11px;
  color: var(--c-text-2);
}
.meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.ops {
  text-align: right;
}
.ops button {
  padding: 2px 10px;
  font-size: 12px;
}
.empty {
  padding: 60px 20px;
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
.preview-img {
  max-width: 100%;
  border: 1px solid var(--c-border);
  border-radius: 4px;
}
</style>
