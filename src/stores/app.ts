/**
 * 全局业务仓库：院区/楼层/房间/图纸/照片/版本，持久化于 IndexedDB。
 */
import { defineStore } from 'pinia'
import { toRaw } from 'vue'
import { nanoid } from 'nanoid'
import type {
  ArchiveQuery,
  Campus,
  Drawing,
  DrawingEntity,
  DrawingVersion,
  Floor,
  PhotoRecord,
  Room,
} from '@/types'
import { idb } from '@/data/idb'
import { diffDrawings } from '@/data/diff'
import type { VersionDiff } from '@/types'
import { DEFAULT_LAYER_STATE } from '@/data/factory'

interface State {
  loaded: boolean
  campuses: Campus[]
  floors: Floor[]
  rooms: Room[]
  drawings: Drawing[]
  photos: PhotoRecord[]
  versions: DrawingVersion[]
  currentCampusId: string | null
  currentFloorId: string | null
  currentRoomId: string | null
  currentDrawingId: string | null
  author: string
}

export const useAppStore = defineStore('app', {
  state: (): State => ({
    loaded: false,
    campuses: [],
    floors: [],
    rooms: [],
    drawings: [],
    photos: [],
    versions: [],
    currentCampusId: null,
    currentFloorId: null,
    currentRoomId: null,
    currentDrawingId: null,
    author: '基建科',
  }),

  getters: {
    floorsByCampus: (s) => (campusId: string) => s.floors.filter((f) => f.campusId === campusId),
    roomsByFloor: (s) => (floorId: string) => s.rooms.filter((r) => r.floorId === floorId),
    drawingsByRoom: (s) => (roomId: string) =>
      s.drawings.filter((d) => d.roomId === roomId).sort((a, b) => b.version - a.version),
    photosByRoom: (s) => (roomId: string) => s.photos.filter((p) => p.roomId === roomId),
    versionsOfDrawing: (s) => (drawingId: string) =>
      s.versions
        .filter((v) => v.drawingId === drawingId)
        .sort((a, b) => b.version - a.version),
    currentDrawing(s): Drawing | null {
      return s.drawings.find((d) => d.id === s.currentDrawingId) ?? null
    },
    currentRoom(s): Room | null {
      return s.rooms.find((r) => r.id === s.currentRoomId) ?? null
    },
    currentFloor(s): Floor | null {
      return s.floors.find((f) => f.id === s.currentFloorId) ?? null
    },
    currentCampus(s): Campus | null {
      return s.campuses.find((c) => c.id === s.currentCampusId) ?? null
    },
  },

  actions: {
    async loadAll() {
      const [campuses, floors, rooms, drawings, photos, versions] = await Promise.all([
        idb.getAll<Campus>('campuses'),
        idb.getAll<Floor>('floors'),
        idb.getAll<Room>('rooms'),
        idb.getAll<Drawing>('drawings'),
        idb.getAll<PhotoRecord>('photos'),
        idb.getAll<DrawingVersion>('versions'),
      ])
      this.campuses = campuses
      this.floors = floors
      this.rooms = rooms
      this.drawings = drawings
      this.photos = photos
      this.versions = versions
      this.loaded = true
      if (!this.currentCampusId && campuses[0]) this.currentCampusId = campuses[0].id
    },

    async saveCampus(c: Campus) {
      await idb.put('campuses', c)
      const i = this.campuses.findIndex((x) => x.id === c.id)
      if (i >= 0) this.campuses[i] = c
      else this.campuses.push(c)
    },

    async saveFloor(f: Floor) {
      await idb.put('floors', f)
      const i = this.floors.findIndex((x) => x.id === f.id)
      if (i >= 0) this.floors[i] = f
      else this.floors.push(f)
    },

    async saveRoom(r: Room) {
      await idb.put('rooms', r)
      const i = this.rooms.findIndex((x) => x.id === r.id)
      if (i >= 0) this.rooms[i] = r
      else this.rooms.push(r)
    },

    async deleteRoom(id: string) {
      await idb.delete('rooms', id)
      this.rooms = this.rooms.filter((r) => r.id !== id)
    },

    /** 保存图纸（整对象替换），不产生版本 */
    async persistDrawing(d: Drawing) {
      d.updatedAt = Date.now()
      await idb.put('drawings', d)
      const i = this.drawings.findIndex((x) => x.id === d.id)
      if (i >= 0) this.drawings[i] = d
      else this.drawings.push(d)
      this.refreshRoomMaintenance(d.roomId)
    },

    /**
     * 提交一个新版本：深拷贝当前图纸为快照，version+1，写 versions 仓库。
     * 返回新版本号。
     */
    async commitVersion(d: Drawing, changeNote: string): Promise<number> {
      d.version += 1
      d.updatedAt = Date.now()
      // toRaw + JSON 深拷贝：structuredClone 无法处理 Pinia 的响应式代理
      const snapshot = JSON.parse(JSON.stringify(toRaw(d))) as Drawing
      const v: DrawingVersion = {
        id: nanoid(12),
        drawingId: d.id,
        version: d.version,
        docNo: d.docNo,
        changeNote,
        author: this.author,
        snapshot,
        createdAt: Date.now(),
      }
      await idb.put('versions', v)
      await idb.put('drawings', d)
      this.versions.push(v)
      const i = this.drawings.findIndex((x) => x.id === d.id)
      if (i >= 0) this.drawings[i] = d
      return d.version
    },

    /** 比对指定图纸两个版本（默认最新两版） */
    diffVersions(drawingId: string, fromVer?: number, toVer?: number): VersionDiff | null {
      const vs = this.versionsOfDrawing(drawingId)
      if (vs.length < 2) return null
      const to = toVer != null ? vs.find((v) => v.version === toVer) : vs[0]
      const from =
        fromVer != null ? vs.find((v) => v.version === fromVer) : vs[1]
      if (!from || !to) return null
      return diffDrawings(from.snapshot, to.snapshot)
    },

    /** 回滚到指定版本：以该快照另存为最新在制图档（保留历史） */
    async restoreVersion(drawingId: string, version: number): Promise<Drawing | null> {
      const v = this.versions.find((x) => x.drawingId === drawingId && x.version === version)
      if (!v) return null
      const d = this.drawings.find((x) => x.id === drawingId)
      if (!d) return null
      const restored = JSON.parse(JSON.stringify(toRaw(v.snapshot))) as Drawing
      restored.id = d.id
      restored.archived = false
      restored.archivedAt = undefined
      restored.layerState = { ...DEFAULT_LAYER_STATE(), ...restored.layerState }
      await this.persistDrawing(restored)
      return restored
    },

    async archiveDrawing(d: Drawing) {
      d.archived = true
      d.archivedAt = Date.now()
      await this.persistDrawing(d)
    },

    async unarchiveDrawing(d: Drawing) {
      d.archived = false
      d.archivedAt = undefined
      await this.persistDrawing(d)
    },

    async deleteDrawing(id: string) {
      await idb.delete('drawings', id)
      this.drawings = this.drawings.filter((d) => d.id !== id)
      const vs = await idb.getAllByIndex<DrawingVersion>('versions', 'drawingId', id)
      for (const v of vs) await idb.delete('versions', v.id)
      this.versions = this.versions.filter((v) => v.drawingId !== id)
      if (this.currentDrawingId === id) this.currentDrawingId = null
    },

    async savePhoto(p: PhotoRecord, blob: Blob) {
      await idb.put('blobs', { id: p.blobKey, blob })
      await idb.put('photos', p)
      this.photos.push(p)
    },

    async getPhotoBlob(blobKey: string): Promise<Blob | undefined> {
      const rec = await idb.get<{ id: string; blob: Blob }>('blobs', blobKey)
      return rec?.blob
    },

    async deletePhoto(id: string) {
      const p = this.photos.find((x) => x.id === id)
      if (p) {
        await idb.delete('blobs', p.blobKey)
        await idb.delete('photos', id)
        this.photos = this.photos.filter((x) => x.id !== id)
      }
    },

    /** 汇总房间内设备最近检修日期 */
    refreshRoomMaintenance(roomId: string) {
      const room = this.rooms.find((r) => r.id === roomId)
      if (!room) return
      let latest: string | undefined
      for (const d of this.drawings.filter((x) => x.roomId === roomId)) {
        for (const e of d.entities) {
          const date = e.device?.lastMaintenanceDate
          if (date && (!latest || date > latest)) latest = date
        }
      }
      room.lastMaintenanceDate = latest
      idb.put('rooms', room)
    },

    /** 归档检索：院区 + 楼层 + 房间号(模糊) + 改造年份 + 关键字 */
    searchArchive(q: ArchiveQuery): Drawing[] {
      return this.drawings
        .filter((d) => d.archived)
        .filter((d) => !q.campusId || d.campusId === q.campusId)
        .filter((d) => !q.floorId || d.floorId === q.floorId)
        .filter((d) => {
          if (!q.roomNo) return true
          const room = this.rooms.find((r) => r.id === d.roomId)
          return room?.roomNo.includes(q.roomNo) ?? false
        })
        .filter((d) => !q.renovationYear || d.renovationYear === q.renovationYear)
        .filter((d) => {
          if (!q.keyword) return true
          const room = this.rooms.find((r) => r.id === d.roomId)
          const hay = `${d.docNo} ${d.title} ${room?.roomNo ?? ''} ${room?.name ?? ''}`
          return hay.toLowerCase().includes(q.keyword.toLowerCase())
        })
        .sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0))
    },

    /** 实体编辑后同步（编辑器调用） */
    async upsertEntity(drawingId: string, entity: DrawingEntity) {
      const d = this.drawings.find((x) => x.id === drawingId)
      if (!d) return
      const i = d.entities.findIndex((e) => e.id === entity.id)
      if (i >= 0) d.entities[i] = entity
      else d.entities.push(entity)
      await idb.put('drawings', d)
    },

    async removeEntity(drawingId: string, entityId: string) {
      const d = this.drawings.find((x) => x.id === drawingId)
      if (!d) return
      d.entities = d.entities.filter((e) => e.id !== entityId)
      await idb.put('drawings', d)
    },

    selectContext(campusId: string, floorId?: string, roomId?: string, drawingId?: string) {
      this.currentCampusId = campusId
      this.currentFloorId = floorId ?? null
      this.currentRoomId = roomId ?? null
      this.currentDrawingId = drawingId ?? null
    },
  },
})
