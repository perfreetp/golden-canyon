import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Accessory, Assembly, FigureModel, Pose } from '../types'
import { buildGeometry, detectInterferences } from '../engine/evaluate'
import { capsulePenetration } from '../engine/math'

export interface ViewportApi {
  capture: () => string
  resetView: () => void
}

export interface ViewportProps {
  model: FigureModel
  accessories: Accessory[]
  pose: Pose
  assembly: Assembly
  selectedJoint: string | null
  onSelectJoint: (id: string) => void
  onDragJoint?: (jointId: string, dofIndex: number, deltaDeg: number) => void
  showLabels?: boolean
  showCollision?: boolean
  className?: string
  /** pull the camera in for small embedded panels */
  compact?: boolean
  onReady?: (api: ViewportApi) => void
}

const SEVERE = 0xff4a50
const MINOR = 0xf0a63a

function capsuleGeo(radius: number, length: number) {
  return new THREE.CapsuleGeometry(radius, Math.max(0.02, length), 6, 18)
}

/** rotation taking +Y onto `dir` */
function alignY(dir: THREE.Vector3): THREE.Quaternion {
  const q = new THREE.Quaternion()
  const d = dir.clone()
  if (d.lengthSq() < 1e-10) return q
  d.normalize()
  if (d.y < -0.99999) return q.set(1, 0, 0, 0)
  return q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d)
}

interface Runtime {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  partMeshes: Map<string, THREE.Mesh>
  jointMeshes: Map<string, THREE.Mesh>
  accGroup: THREE.Group
  jointGroup: THREE.Group
  drag: { id: string; x: number; y: number } | null
  raf: number
}

export default function Viewport(props: ViewportProps) {
  const {
    model,
    accessories,
    pose,
    assembly,
    selectedJoint,
    onSelectJoint,
    onDragJoint,
    showLabels = true,
    showCollision = true,
    className,
    compact = false,
    onReady,
  } = props
  const compactRef = useRef(compact)
  compactRef.current = compact

  const hostRef = useRef<HTMLDivElement>(null)
  const rtRef = useRef<Runtime | null>(null)
  const liveRef = useRef(props)
  liveRef.current = props
  const [labels, setLabels] = useState<
    { x: number; y: number; text: string; tone: 'bad' | 'warn' }[]
  >([])
  const [hoverName, setHoverName] = useState<string | null>(null)
  const ptsRef = useRef<{ p: THREE.Vector3; text: string; tone: 'bad' | 'warn' }[]>([])

  // aim the camera at the figure once the host has a size
  useEffect(() => {
    const host = hostRef.current!
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x0a0d12, 1)
    renderer.domElement.style.outline = 'none'
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x0a0d12, 0.0019)

    const camera = new THREE.PerspectiveCamera(33, 1, 1, 4000)
    camera.position.set(215, 205, 345)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 124, 0)
    controls.enableDamping = true
    controls.dampingFactor = 0.1
    controls.minDistance = 80
    controls.maxDistance = 900
    controls.maxPolarAngle = Math.PI * 0.94
    controls.rotateSpeed = 0.75
    controls.zoomSpeed = 0.9
    controls.panSpeed = 0.7

    scene.add(new THREE.HemisphereLight(0xa8c2e4, 0x181a20, 0.9))
    const key = new THREE.DirectionalLight(0xfff0d8, 2.35)
    key.position.set(190, 330, 250)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0x7fa4d8, 1.15)
    fill.position.set(-280, 130, -170)
    scene.add(fill)
    const rim = new THREE.DirectionalLight(0xffcf94, 1.0)
    rim.position.set(-80, 80, -340)
    scene.add(rim)

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(360, 64),
      new THREE.MeshStandardMaterial({ color: 0x0e131a, roughness: 0.96, metalness: 0.02 }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -1.6
    scene.add(floor)
    const grid = new THREE.GridHelper(720, 36, 0x283142, 0x171d26)
    grid.position.y = -1.5
    ;(grid.material as THREE.Material).transparent = true
    ;(grid.material as THREE.Material).opacity = 0.75
    scene.add(grid)

    const accGroup = new THREE.Group()
    const jointGroup = new THREE.Group()
    scene.add(accGroup, jointGroup)

    const rt: Runtime = {
      renderer,
      scene,
      camera,
      controls,
      partMeshes: new Map(),
      jointMeshes: new Map(),
      accGroup,
      jointGroup,
      drag: null,
      raf: 0,
    }
    rtRef.current = rt

    /**
     * Frame the figure: distance is derived from the model's bounding sphere and
     * the narrower of the two FOVs, so narrow embedded panels pull back instead
     * of cropping the head.
     */
    let userMoved = false
    const fit = (first: boolean) => {
      const w = host.clientWidth
      const h = host.clientHeight
      if (!w || !h) return
      const radius = 132
      const vFov = (camera.fov * Math.PI) / 180
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect)
      const fov = Math.min(vFov, hFov)
      const dist = (radius / Math.sin(fov / 2)) * (compactRef.current ? 1.16 : 0.96)
      const dir = new THREE.Vector3(0.52, 0.22, 1).normalize()
      const target = new THREE.Vector3(0, 120, 0)
      void 0
      camera.position.copy(target).add(dir.multiplyScalar(dist))
      camera.near = Math.max(1, dist * 0.05)
      camera.far = dist * 12
      camera.updateProjectionMatrix()
      controls.target.copy(target)
      controls.update()
      if (first) camera.lookAt(target)
    }

    const resize = () => {
      const w = host.clientWidth
      const h = host.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      if (!userMoved) fit(false)
    }
    resize()
    fit(true)
    const ro = new ResizeObserver(resize)
    ro.observe(host)
    controls.addEventListener('start', () => {
      userMoved = true
    })

    const raycaster = new THREE.Raycaster()
    raycaster.params.Points = { threshold: 2 }
    const ndc = new THREE.Vector2()

    const pickJoint = (ev: PointerEvent): string | null => {
      const rect = renderer.domElement.getBoundingClientRect()
      ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1
      ndc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(ndc, camera)
      const hits = raycaster.intersectObjects([...rt.jointMeshes.values()], false)
      return hits.length ? (hits[0].object.userData.jointId as string) : null
    }

    const onDown = (ev: PointerEvent) => {
      if (ev.button !== 0) return
      const id = pickJoint(ev)
      if (!id) return
      liveRef.current.onSelectJoint(id)
      rt.drag = { id, x: ev.clientX, y: ev.clientY }
      controls.enabled = false
      try {
        renderer.domElement.setPointerCapture(ev.pointerId)
      } catch {
        /* ignore */
      }
      ev.preventDefault()
    }

    const onMove = (ev: PointerEvent) => {
      if (rt.drag) {
        const dx = ev.clientX - rt.drag.x
        const dy = ev.clientY - rt.drag.y
        rt.drag.x = ev.clientX
        rt.drag.y = ev.clientY
        const joint = liveRef.current.model.joints.find((j) => j.id === rt.drag!.id)
        if (!joint) return
        const multi = joint.dofs.length > 1
        const dof = multi && ev.shiftKey ? 1 : 0
        const delta = (dof === 0 ? -dy : dx) * 0.62
        liveRef.current.onDragJoint?.(rt.drag.id, dof, delta)
        return
      }
      const id = pickJoint(ev)
      renderer.domElement.style.cursor = id ? 'grab' : 'default'
      const j = id ? liveRef.current.model.joints.find((x) => x.id === id) : null
      setHoverName(j ? j.name : null)
    }

    const endDrag = (ev: PointerEvent) => {
      if (!rt.drag) return
      rt.drag = null
      controls.enabled = true
      try {
        renderer.domElement.releasePointerCapture(ev.pointerId)
      } catch {
        /* ignore */
      }
    }

    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault()
    }

    renderer.domElement.addEventListener('pointerdown', onDown)
    renderer.domElement.addEventListener('pointermove', onMove)
    renderer.domElement.addEventListener('pointerup', endDrag)
    renderer.domElement.addEventListener('pointercancel', endDrag)
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false })

    const tick = () => {
      rt.raf = requestAnimationFrame(tick)
      rt.controls.update()
      renderer.render(scene, camera)
    }
    tick()

    const api: ViewportApi = {
      capture: () => {
        renderer.render(scene, camera)
        return renderer.domElement.toDataURL('image/jpeg', 0.7)
      },
      resetView: () => {
        userMoved = false
        fit(true)
      },
    }
    onReady?.(api)

    return () => {
      cancelAnimationFrame(rt.raf)
      ro.disconnect()
      renderer.domElement.removeEventListener('pointerdown', onDown)
      renderer.domElement.removeEventListener('pointermove', onMove)
      renderer.domElement.removeEventListener('pointerup', endDrag)
      renderer.domElement.removeEventListener('pointercancel', endDrag)
      renderer.domElement.removeEventListener('wheel', onWheel)
      controls.dispose()
      renderer.dispose()
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement)
      rtRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // project clash labels every few frames so they track the orbit
  useEffect(() => {
    let id = 0
    const loop = () => {
      id = requestAnimationFrame(loop)
      const rt = rtRef.current
      const host = hostRef.current
      if (!rt || !host || !liveRef.current.showLabels) return
      const w = host.clientWidth
      const h = host.clientHeight
      if (!w || !h) return
      const v = new THREE.Vector3()
      const out: { x: number; y: number; text: string; tone: 'bad' | 'warn' }[] = []
      for (const it of ptsRef.current.slice(0, 5)) {
        v.copy(it.p).project(rt.camera)
        if (v.z > 1) continue
        out.push({
          x: (v.x * 0.5 + 0.5) * w,
          y: (v.y * 0.5 + 0.5) * h,
          text: it.text,
          tone: it.tone,
        })
      }
      setLabels((prev) => {
        if (prev.length === 0 && out.length === 0) return prev
        const same =
          prev.length === out.length &&
          prev.every(
            (p, i) =>
              Math.abs(p.x - out[i].x) < 0.6 &&
              Math.abs(p.y - out[i].y) < 0.6 &&
              p.text === out[i].text,
          )
        return same ? prev : out
      })
    }
    loop()
    return () => cancelAnimationFrame(id)
  }, [])

  // ---- geometry sync ----
  useEffect(() => {
    const rt = rtRef.current
    if (!rt) return
    for (const m of rt.partMeshes.values()) {
      rt.scene.remove(m)
      m.geometry.dispose()
      ;(m.material as THREE.Material).dispose()
    }
    rt.partMeshes.clear()
    for (const m of rt.jointMeshes.values()) {
      rt.jointGroup.remove(m)
      m.geometry.dispose()
      ;(m.material as THREE.Material).dispose()
    }
    rt.jointMeshes.clear()

    for (const part of model.parts) {
      const len = Math.hypot(part.b[0] - part.a[0], part.b[1] - part.a[1], part.b[2] - part.a[2])
      const mesh = new THREE.Mesh(
        capsuleGeo(part.radius, len),
        new THREE.MeshStandardMaterial({ color: part.color, roughness: 0.55, metalness: 0.14 }),
      )
      mesh.userData.partId = part.id
      rt.scene.add(mesh)
      rt.partMeshes.set(part.id, mesh)
    }

    for (const j of model.joints) {
      // one visual handle, plus an invisible fat proxy so the pointer can grab it
      const geo =
        j.kind === 'ball'
          ? new THREE.SphereGeometry(5.2, 18, 14)
          : new THREE.TorusGeometry(5.6, 1.4, 8, 22)
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x46566e }))
      mesh.userData.jointId = j.id
      mesh.renderOrder = 5
      rt.jointGroup.add(mesh)
      rt.jointMeshes.set(j.id, mesh)

      const pick = new THREE.Mesh(
        new THREE.SphereGeometry(11, 10, 8),
        new THREE.MeshBasicMaterial({ visible: false, depthWrite: false }),
      )
      pick.userData.jointId = j.id
      pick.userData.isPick = true
      pick.renderOrder = 6
      mesh.add(pick)
    }
  }, [model, accessories])

  // ---- per-pose evaluation ----
  useEffect(() => {
    const rt = rtRef.current
    if (!rt) return
    const build = buildGeometry(model, accessories, pose, assembly)
    const { transforms } = build

    for (const part of model.parts) {
      const mesh = rt.partMeshes.get(part.id)
      const t = transforms.get(part.jointId)
      if (!mesh || !t) continue
      const q = new THREE.Quaternion(t.quat[0], t.quat[1], t.quat[2], t.quat[3])
      const pivot = new THREE.Vector3(t.pos[0], t.pos[1], t.pos[2])
      const a = new THREE.Vector3(part.a[0], part.a[1], part.a[2]).applyQuaternion(q)
      const b = new THREE.Vector3(part.b[0], part.b[1], part.b[2]).applyQuaternion(q)
      mesh.position.copy(pivot).add(a.clone().add(b).multiplyScalar(0.5))
      mesh.quaternion.copy(q).multiply(alignY(b.clone().sub(a)))
    }

    // accessories
    for (const child of [...rt.accGroup.children]) {
      rt.accGroup.remove(child)
      const mesh = child as THREE.Mesh
      mesh.geometry?.dispose()
      if (mesh.material) (mesh.material as THREE.Material).dispose()
    }
    const accMeshes: { mesh: THREE.Mesh; baseColor: string }[] = []
    for (const p of build.placed) {
      const q = new THREE.Quaternion(p.quat[0], p.quat[1], p.quat[2], p.quat[3])
      const pivot = new THREE.Vector3(p.pos[0], p.pos[1], p.pos[2])
      for (let i = 0; i < p.acc.proxies.length; i++) {
        const px = p.acc.proxies[i]
        const a = new THREE.Vector3(px.a[0], px.a[1], px.a[2]).applyQuaternion(q)
        const b = new THREE.Vector3(px.b[0], px.b[1], px.b[2]).applyQuaternion(q)
        const len = b.distanceTo(a)
        const mesh = new THREE.Mesh(
          capsuleGeo(px.radius, len),
          new THREE.MeshStandardMaterial({
            color: px.color,
            roughness: px.collide ? 0.4 : 0.72,
            metalness: px.collide ? 0.42 : 0.18,
            transparent: !px.collide,
            opacity: px.collide ? 1 : 0.5,
          }),
        )
        mesh.position.copy(pivot).add(a.clone().add(b).multiplyScalar(0.5))
        mesh.quaternion.copy(q).multiply(alignY(b.clone().sub(a)))
        mesh.userData.capKey = `acc:${p.acc.id}:${i}:${p.slot}`
        rt.accGroup.add(mesh)
        accMeshes.push({ mesh, baseColor: px.color })
      }
    }

    // joints
    for (const j of model.joints) {
      const mesh = rt.jointMeshes.get(j.id)
      const t = transforms.get(j.id)
      if (!mesh || !t) continue
      mesh.position.set(t.pos[0], t.pos[1], t.pos[2])
      const q = new THREE.Quaternion(t.quat[0], t.quat[1], t.quat[2], t.quat[3])
      if (j.kind === 'hinge' && j.dofs[0]) {
        const ax = new THREE.Vector3(...j.dofs[0].axis).applyQuaternion(q)
        // torus hole follows the hinge axis
        mesh.quaternion.copy(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), ax))
      } else {
        mesh.quaternion.identity()
      }
      const mat = mesh.material as THREE.MeshBasicMaterial
      const sel = j.id === selectedJoint
      mat.color.setHex(sel ? 0xffc46b : j.calibrated ? 0x4d5f79 : 0x8a4a37)
      mesh.scale.setScalar(sel ? 1.35 : 1)
    }

    // collisions
    const recs = showCollision ? detectInterferences(build) : []
    const toneByKey = new Map<string, 'bad' | 'warn'>()
    const points: { p: THREE.Vector3; text: string; tone: 'bad' | 'warn' }[] = []
    const capByKey = new Map(build.capsules.map((c) => [c.key, c]))
    for (const rec of recs) {
      const tone: 'bad' | 'warn' = rec.severity === 'severe' ? 'bad' : 'warn'
      for (const k of [rec.aKey, rec.bKey]) {
        if (toneByKey.get(k) !== 'bad') toneByKey.set(k, tone)
      }
      const A = capByKey.get(rec.aKey)
      const B = capByKey.get(rec.bKey)
      if (!A || !B) continue
      const res = capsulePenetration(A, B)
      points.push({
        p: new THREE.Vector3(...res.point),
        text: `${rec.partA} ⇄ ${rec.partB}  ${rec.depth.toFixed(2)}mm`,
        tone,
      })
    }
    ptsRef.current = points

    // tint body parts
    for (const part of model.parts) {
      const mesh = rt.partMeshes.get(part.id)
      if (!mesh) continue
      const mat = mesh.material as THREE.MeshStandardMaterial
      const tone = toneByKey.get(part.id)
      if (tone === 'bad') {
        mat.color.setHex(SEVERE)
        mat.emissive.setHex(0x38070a)
        mat.emissiveIntensity = 1
      } else if (tone === 'warn') {
        mat.color.setHex(MINOR)
        mat.emissive.setHex(0x2a1700)
        mat.emissiveIntensity = 1
      } else {
        mat.color.set(part.color)
        mat.emissive.setHex(0x000000)
      }
    }

    accMeshes.forEach(({ mesh, baseColor }) => {
      const mat = mesh.material as THREE.MeshStandardMaterial
      const key = mesh.userData.capKey as string
      const hit = recs.find((r) => r.aKey === key || r.bKey === key)
      if (hit) {
        mat.color.setHex(hit.severity === 'severe' ? SEVERE : MINOR)
        mat.emissive.setHex(hit.severity === 'severe' ? 0x38070a : 0x2a1700)
      } else {
        mat.color.set(baseColor)
        mat.emissive.setHex(0x000000)
      }
    })

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, accessories, pose, assembly, selectedJoint, showCollision, showLabels])

  const joint = hoverName ? model.joints.find((j) => j.name === hoverName) : null

  return (
    <div className={`viewport ${className ?? ''}`} ref={hostRef}>
      <div className="overlay">
        {labels.map((l, i) => (
          <div key={i} className={`label3d ${l.tone}`} style={{ left: l.x, top: l.y }}>
            {l.text}
          </div>
        ))}
      </div>
      <div className="hud">
        <span style={{ color: joint ? 'var(--accent)' : 'var(--fg-3)' }}>
          {joint ? `${joint.code} ${joint.name} · ${joint.kind === 'hinge' ? '铰链' : '球关节'}` : '拖拽关节手柄摆姿'}
        </span>
      </div>
      <div className="hintbar">
        <span>
          <span className="kbd">拖拽</span> 旋转关节
        </span>
        <span>
          <span className="kbd">Shift</span> 切第二个轴
        </span>
        <span>
          <span className="kbd">右键</span> 平移
        </span>
      </div>
    </div>
  )
}
