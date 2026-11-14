// localStorage 持久化
const PREFIX = 'neuro-exam:'

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch (e) {
    console.warn('持久化失败', e)
  }
}

export function remove(key) {
  localStorage.removeItem(PREFIX + key)
}

export function nowStamp() {
  return new Date().toLocaleString('zh-CN', { hour12: false })
}
