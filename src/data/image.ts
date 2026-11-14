/** 图片工具：压缩缩略图、读取为 Blob */

export async function fileToBlob(file: File): Promise<Blob> {
  return file.slice(0, file.size, file.type)
}

export function makeThumbDataUrl(file: File, maxSize = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.72))
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    img.src = url
  })
}

/** 无真实照片时生成一张占位示意图（现场照片风格的灰底平面草图） */
export function placeholderPhotoDataUrl(label: string, tone: string): { dataUrl: string; blob: Blob } {
  const canvas = document.createElement('canvas')
  canvas.width = 480
  canvas.height = 320
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = tone
  ctx.fillRect(0, 0, 480, 320)
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'
  ctx.lineWidth = 3
  ctx.strokeRect(40, 40, 400, 240)
  ctx.lineWidth = 1.5
  for (let i = 1; i < 4; i++) {
    ctx.beginPath()
    ctx.moveTo(40, 40 + (240 / 4) * i)
    ctx.lineTo(440, 40 + (240 / 4) * i)
    ctx.stroke()
  }
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.font = 'bold 22px sans-serif'
  ctx.fillText(label, 56, 78)
  ctx.font = '13px sans-serif'
  ctx.fillText('系统内置示意（可在档案模块替换为现场照片）', 56, 296)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.75)
  const blob = dataUrlToBlob(dataUrl)
  return { dataUrl, blob }
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, base64] = dataUrl.split(',')
  const mime = /:(.*?);/.exec(head)?.[1] ?? 'image/jpeg'
  const bin = atob(base64)
  const len = bin.length
  const arr = new Uint8Array(len)
  for (let i = 0; i < len; i++) arr[i] = bin.charCodeAt(i)
  return new Blob([arr], { type: mime })
}
