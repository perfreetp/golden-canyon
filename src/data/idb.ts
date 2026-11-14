/**
 * IndexedDB 轻封装（无第三方依赖）。
 * 库：erccad，对象仓库按领域模型拆分；照片原图以 Blob 单独存放。
 */

const DB_NAME = 'erccad'
const DB_VERSION = 1

export const STORES = [
  'campuses',
  'floors',
  'rooms',
  'drawings',
  'versions',
  'photos',
  'blobs',
  'meta',
] as const

export type StoreName = (typeof STORES)[number]

let dbPromise: Promise<IDBDatabase> | null = null

/**
 * 剥离 Vue 响应式代理。IndexedDB 的结构化克隆算法无法处理 Proxy，
 * 所有写入统一在此深拷贝为普通对象（数据均为可 JSON 序列化的业务对象）。
 */
function toPlain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: 'id' })
        }
      }
      const drawings = req.transaction?.objectStore('drawings')
      drawings?.createIndex('roomId', 'roomId', { unique: false })
      drawings?.createIndex('archived', 'archived', { unique: false })
      const photos = req.transaction?.objectStore('photos')
      photos?.createIndex('roomId', 'roomId', { unique: false })
      const versions = req.transaction?.objectStore('versions')
      versions?.createIndex('drawingId', 'drawingId', { unique: false })
      const rooms = req.transaction?.objectStore('rooms')
      rooms?.createIndex('floorId', 'floorId', { unique: false })
      const floors = req.transaction?.objectStore('floors')
      floors?.createIndex('campusId', 'campusId', { unique: false })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode)
        const req = fn(t.objectStore(store))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )
}

export async function resetDatabase(): Promise<void> {
  // 先关闭缓存连接，避免 deleteDatabase 被 blocked
  if (dbPromise) {
    const db = await dbPromise
    db.close()
    dbPromise = null
  }
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase(DB_NAME)
    req.onsuccess = () => resolve()
    req.onerror = () => resolve()
    req.onblocked = () => resolve()
  })
}

export const idb = {
  async get<T>(store: StoreName, id: string): Promise<T | undefined> {
    return tx<T | undefined>(store, 'readonly', (s) => s.get(id) as IDBRequest<T | undefined>)
  },
  async getAll<T>(store: StoreName): Promise<T[]> {
    return tx<T[]>(store, 'readonly', (s) => s.getAll() as IDBRequest<T[]>)
  },
  async getAllByIndex<T>(store: StoreName, index: string, value: IDBValidKey): Promise<T[]> {
    return openDB().then(
      (db) =>
        new Promise<T[]>((resolve, reject) => {
          const t = db.transaction(store, 'readonly')
          const req = t.objectStore(store).index(index).getAll(value)
          req.onsuccess = () => resolve(req.result as T[])
          req.onerror = () => reject(req.error)
        }),
    )
  },
  async put<T extends { id: string }>(store: StoreName, value: T): Promise<T> {
    // blobs 仓库含二进制 Blob，不能走 JSON，直接交给 IDB 结构化克隆
    const payload = store === 'blobs' ? value : toPlain(value)
    await tx(store, 'readwrite', (s) => s.put(payload) as IDBRequest<IDBValidKey>)
    return value
  },
  async putMany<T extends { id: string }>(store: StoreName, values: T[]): Promise<void> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const t = db.transaction(store, 'readwrite')
      const s = t.objectStore(store)
      for (const v of values) s.put(store === 'blobs' ? v : toPlain(v))
      t.oncomplete = () => resolve()
      t.onerror = () => reject(t.error)
    })
  },
  async delete(store: StoreName, id: string): Promise<void> {
    await tx(store, 'readwrite', (s) => s.delete(id))
  },
  async clear(store: StoreName): Promise<void> {
    await tx(store, 'readwrite', (s) => s.clear())
  },
}
