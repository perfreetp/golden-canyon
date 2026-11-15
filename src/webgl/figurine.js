// 原生 WebGL2 手办素体渲染器:头雕/躯干/披风/底座 四个分色区
// 支持:轨道相机、区域点击拾取(离屏ID渲染)、按区域颜色+光泽度着色、漏涂标红脉冲

// ---------- 向量/矩阵 ----------
function mat4Identity() { return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1] }
function mat4Multiply(a, b) {
  const o = new Array(16)
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    o[c*4+r] = a[r]*b[c*4] + a[4+r]*b[c*4+1] + a[8+r]*b[c*4+2] + a[12+r]*b[c*4+3]
  }
  return o
}
function mat4Perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far)
  return [f/aspect,0,0,0, 0,f,0,0, 0,0,(far+near)*nf,-1, 0,0,2*far*near*nf,0]
}
function mat4LookAt(eye, center, up) {
  let zx = eye[0]-center[0], zy = eye[1]-center[1], zz = eye[2]-center[2]
  let l = Math.hypot(zx,zy,zz); zx/=l; zy/=l; zz/=l
  let xx = up[1]*zz - up[2]*zy, xy = up[2]*zx - up[0]*zz, xz = up[0]*zy - up[1]*zx
  l = Math.hypot(xx,xy,xz); xx/=l; xy/=l; xz/=l
  const yx = zy*xz - zz*xy, yy = zz*xx - zx*xz, yz = zx*xy - zy*xx
  return [
    xx, yx, zx, 0,  xy, yy, zy, 0,  xz, yz, zz, 0,
    -(xx*eye[0]+xy*eye[1]+xz*eye[2]),
    -(yx*eye[0]+yy*eye[1]+yz*eye[2]),
    -(zx*eye[0]+zy*eye[1]+zz*eye[2]), 1
  ]
}
function mat4Translate(x, y, z) { return [1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1] }
function mat4Scale(x, y, z) { return [x,0,0,0, 0,y,0,0, 0,0,z,0, 0,0,0,1] }
function mat4RotY(a) { const c=Math.cos(a),s=Math.sin(a); return [c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1] }
function mat3FromMat4(m) { // 法线矩阵(取左上3x3,等比缩放下可用)
  return [m[0],m[1],m[2], m[4],m[5],m[6], m[8],m[9],m[10]]
}

// ---------- 几何生成 ----------
function sphere(lat = 24, lon = 32) {
  const pos = [], nrm = [], idx = []
  for (let i = 0; i <= lat; i++) {
    const t = i / lat * Math.PI
    for (let j = 0; j <= lon; j++) {
      const p = j / lon * 2 * Math.PI
      const x = Math.sin(t) * Math.cos(p), y = Math.cos(t), z = Math.sin(t) * Math.sin(p)
      pos.push(x, y, z); nrm.push(x, y, z)
    }
  }
  for (let i = 0; i < lat; i++) for (let j = 0; j < lon; j++) {
    const a = i * (lon + 1) + j, b = a + lon + 1
    idx.push(a, b, a + 1, b, b + 1, a + 1)
  }
  return { pos, nrm, idx }
}

// 车削曲线(躯干):profile = [[radius, y], ...] 自下而上
function lathe(profile, seg = 36) {
  const pos = [], nrm = [], idx = []
  const n = profile.length
  for (let i = 0; i < n; i++) {
    const [r0, y0] = profile[Math.max(0, i - 1)]
    const [r1, y1] = profile[Math.min(n - 1, i + 1)]
    const dr = r1 - r0, dy = y1 - y0
    const nl = Math.hypot(dr, dy) || 1
    for (let j = 0; j <= seg; j++) {
      const a = j / seg * 2 * Math.PI
      const [r, y] = profile[i]
      pos.push(r * Math.cos(a), y, r * Math.sin(a))
      nrm.push((dy / nl) * Math.cos(a), -dr / nl, (dy / nl) * Math.sin(a))
    }
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < seg; j++) {
    const a = i * (seg + 1) + j, b = a + seg + 1
    idx.push(a, b, a + 1, b, b + 1, a + 1)
  }
  return { pos, nrm, idx }
}

// 开口锥台(披风,只覆盖背面 220°)
function capeShell(rTop, rBot, h, yBase, startA, sweepA, seg = 28) {
  const pos = [], nrm = [], idx = []
  const slope = Math.atan2(rBot - rTop, h)
  for (let i = 0; i <= 1; i++) {
    const r = i === 0 ? rTop : rBot, y = yBase + (i === 0 ? h : 0)
    for (let j = 0; j <= seg; j++) {
      const a = startA + j / seg * sweepA
      pos.push(r * Math.cos(a), y, r * Math.sin(a))
      nrm.push(Math.cos(a) * Math.cos(slope), Math.sin(slope), Math.sin(a) * Math.cos(slope))
    }
  }
  for (let j = 0; j < seg; j++) {
    const a = j, b = j + seg + 1
    idx.push(a, a + 1, b, b, a + 1, b + 1)
  }
  return { pos, nrm, idx }
}

function cylinder(rTop, rBot, h, seg = 36, capTop = true, capBot = true) {
  const g = lathe([[rBot, 0], [rTop, h]], seg)
  if (capTop) g.pos && capAdd(g, rTop, h, 1, seg)
  if (capBot) capAdd(g, rBot, 0, -1, seg)
  return g
}
function capAdd(g, r, y, dir, seg) {
  const base = g.pos.length / 3
  g.pos.push(0, y, 0); g.nrm.push(0, dir, 0)
  for (let j = 0; j <= seg; j++) {
    const a = j / seg * 2 * Math.PI
    g.pos.push(r * Math.cos(a), y, r * Math.sin(a))
    g.nrm.push(0, dir, 0)
  }
  for (let j = 0; j < seg; j++) {
    if (dir > 0) g.idx.push(base, base + 1 + j, base + 2 + j)
    else g.idx.push(base, base + 2 + j, base + 1 + j)
  }
}

// ---------- 着色器 ----------
const VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
uniform mat4 uProj, uView, uModel;
uniform mat3 uNrmMat;
out vec3 vNrm; out vec3 vPos;
void main() {
  vec4 wp = uModel * vec4(aPos, 1.0);
  vPos = wp.xyz;
  vNrm = uNrmMat * aNrm;
  gl_Position = uProj * uView * wp;
}`

const FS = `#version 300 es
precision highp float;
in vec3 vNrm; in vec3 vPos;
uniform vec3 uColor, uEye;
uniform float uGloss;      // 0哑光 ~ 1高光/金属
uniform float uHighlight;  // 标红脉冲 0~1
uniform float uSelected;   // 选中描边提亮
out vec4 frag;
void main() {
  vec3 N = normalize(vNrm);
  vec3 L1 = normalize(vec3(0.6, 0.9, 0.5));
  vec3 L2 = normalize(vec3(-0.5, 0.3, -0.6));
  vec3 V = normalize(uEye - vPos);
  float diff = max(dot(N, L1), 0.0) * 0.85 + max(dot(N, L2), 0.0) * 0.3 + 0.18;
  vec3 H = normalize(L1 + V);
  float shin = mix(8.0, 160.0, uGloss);
  float spec = pow(max(dot(N, H), 0.0), shin) * mix(0.08, 0.9, uGloss);
  vec3 col = uColor * diff + vec3(spec);
  //  Fresnel 让金属/珠光更有质感
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  col += fres * uGloss * 0.25;
  col = mix(col, vec3(1.0, 0.15, 0.1), uHighlight * (0.55 + 0.45 * sin(uHighlight * 6.2831)));
  col += uSelected * 0.12;
  frag = vec4(col, 1.0);
}`

const PICK_VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
uniform mat4 uProj, uView, uModel;
void main() { gl_Position = uProj * uView * uModel * vec4(aPos, 1.0); }`

const PICK_FS = `#version 300 es
precision highp float;
uniform vec3 uIdColor;
out vec4 frag;
void main() { frag = vec4(uIdColor, 1.0); }`

// ---------- 渲染器 ----------
export class FigurineRenderer {
  constructor(canvas) {
    this.canvas = canvas
    const gl = canvas.getContext('webgl2', { antialias: true })
    if (!gl) throw new Error('当前浏览器不支持 WebGL2')
    this.gl = gl
    this.rotX = -0.25; this.rotY = 0.6; this.dist = 7.5
    this.regions = {}      // key -> {color:[r,g,b], gloss:0~1, highlight:bool}
    this.selected = null
    this.onPick = null
    this.time = 0
    this._buildMeshes()
    this._buildPrograms()
    this._buildPickTarget()
    this._bindEvents()
    this._running = true
    this._loop = this._loop.bind(this)
    requestAnimationFrame(this._loop)
  }

  _buildMeshes() {
    // 四个分色区(单位:头雕球心 y≈2.55)
    this.parts = [
      { key: 'head',  geo: sphere(), model: mat4Multiply(mat4Translate(0, 2.55, 0), mat4Scale(0.62, 0.68, 0.62)) },
      { key: 'torso', geo: lathe([[0.02,0],[0.5,0.02],[0.62,0.35],[0.55,0.9],[0.42,1.35],[0.46,1.6],[0.3,1.85],[0.14,1.95],[0.0,1.98]]),
                      model: mat4Translate(0, 0.62, 0) },
      { key: 'cape',  geo: capeShell(0.42, 1.05, 2.1, 0.35, Math.PI * 0.6, Math.PI * 1.35),
                      model: mat4Identity() },
      { key: 'base',  geo: cylinder(1.05, 1.2, 0.32), model: mat4Identity() }
    ]
  }

  _compile(vsSrc, fsSrc) {
    const gl = this.gl
    const mk = (type, src) => {
      const s = gl.createShader(type)
      gl.shaderSource(s, src); gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s))
      return s
    }
    const p = gl.createProgram()
    gl.attachShader(p, mk(gl.VERTEX_SHADER, vsSrc))
    gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fsSrc))
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p))
    return p
  }

  _buildPrograms() {
    const gl = this.gl
    this.prog = this._compile(VS, FS)
    this.pickProg = this._compile(PICK_VS, PICK_FS)
    this.u = {}
    for (const n of ['uProj','uView','uModel','uNrmMat','uColor','uEye','uGloss','uHighlight','uSelected'])
      this.u[n] = gl.getUniformLocation(this.prog, n)
    this.pu = {}
    for (const n of ['uProj','uView','uModel','uIdColor'])
      this.pu[n] = gl.getUniformLocation(this.pickProg, n)
    for (const part of this.parts) {
      const vao = gl.createVertexArray()
      gl.bindVertexArray(vao)
      const pb = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, pb)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(part.geo.pos), gl.STATIC_DRAW)
      gl.enableVertexAttribArray(0)
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)
      const nb = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, nb)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(part.geo.nrm), gl.STATIC_DRAW)
      gl.enableVertexAttribArray(1)
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0)
      const ib = gl.createBuffer()
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib)
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(part.geo.idx), gl.STATIC_DRAW)
      part.vao = vao
      part.count = part.geo.idx.length
    }
    gl.bindVertexArray(null)
  }

  _buildPickTarget() {
    const gl = this.gl
    this.pickFbo = gl.createFramebuffer()
    this.pickTex = gl.createTexture()
    this.pickDepth = gl.createRenderbuffer()
  }

  _resize() {
    const c = this.canvas
    const w = c.clientWidth * devicePixelRatio | 0
    const h = c.clientHeight * devicePixelRatio | 0
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h }
    const gl = this.gl
    gl.bindTexture(gl.TEXTURE_2D, this.pickTex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.pickDepth)
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.pickFbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.pickTex, 0)
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.pickDepth)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  _bindEvents() {
    const c = this.canvas
    let drag = null
    c.addEventListener('pointerdown', e => {
      drag = { x: e.clientX, y: e.clientY, moved: false }
      c.setPointerCapture(e.pointerId)
    })
    c.addEventListener('pointermove', e => {
      if (!drag) return
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true
      this.rotY += dx * 0.008
      this.rotX = Math.max(-1.4, Math.min(1.4, this.rotX + dy * 0.008))
      drag.x = e.clientX; drag.y = e.clientY
    })
    c.addEventListener('pointerup', e => {
      if (drag && !drag.moved && this.onPick) {
        const key = this._pick(e)
        this.onPick(key)
      }
      drag = null
    })
    c.addEventListener('wheel', e => {
      e.preventDefault()
      this.dist = Math.max(4, Math.min(14, this.dist + e.deltaY * 0.01))
    }, { passive: false })
  }

  _eye() {
    const cx = Math.cos(this.rotX), sx = Math.sin(this.rotX)
    return [
      this.dist * cx * Math.sin(this.rotY),
      this.dist * sx + 1.4,
      this.dist * cx * Math.cos(this.rotY)
    ]
  }

  _matrices() {
    const aspect = this.canvas.width / Math.max(1, this.canvas.height)
    const proj = mat4Perspective(0.7, aspect, 0.1, 100)
    const view = mat4LookAt(this._eye(), [0, 1.4, 0], [0, 1, 0])
    return { proj, view }
  }

  _pick(e) {
    const gl = this.gl
    const rect = this.canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) * devicePixelRatio | 0
    const y = (rect.height - (e.clientY - rect.top)) * devicePixelRatio | 0
    this._renderPass(this.pickProg, this.pu, true)
    const px = new Uint8Array(4)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.pickFbo)
    gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    const idx = px[0] - 1
    return idx >= 0 && idx < this.parts.length ? this.parts[idx].key : null
  }

  _renderPass(prog, uni, pick) {
    const gl = this.gl
    const { proj, view } = this._matrices()
    if (pick) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.pickFbo)
      gl.clearColor(0, 0, 0, 1)
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.clearColor(0.09, 0.1, 0.13, 1)
    }
    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.enable(gl.DEPTH_TEST)
    gl.enable(gl.CULL_FACE)
    gl.useProgram(prog)
    gl.uniformMatrix4fv(uni.uProj, false, proj)
    gl.uniformMatrix4fv(uni.uView, false, view)
    this.parts.forEach((part, i) => {
      gl.uniformMatrix4fv(uni.uModel, false, part.model)
      if (pick) {
        const id = i + 1
        gl.uniform3f(uni.uIdColor, id / 255, 0, 0)
      } else {
        const st = this.regions[part.key] || {}
        const c = st.color || [0.82, 0.8, 0.76] // 素体灰
        gl.uniformMatrix3fv(uni.uNrmMat, false, mat3FromMat4(part.model))
        gl.uniform3f(uni.uColor, c[0], c[1], c[2])
        gl.uniform3fv(uni.uEye, this._eye())
        gl.uniform1f(uni.uGloss, st.gloss ?? 0.15)
        gl.uniform1f(uni.uHighlight, st.highlight ? (this.time % 1.2) / 1.2 : 0)
        gl.uniform1f(uni.uSelected, this.selected === part.key ? 1 : 0)
      }
      gl.bindVertexArray(part.vao)
      gl.drawElements(gl.TRIANGLES, part.count, gl.UNSIGNED_SHORT, 0)
    })
    gl.bindVertexArray(null)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  _loop() {
    if (!this._running) return
    this._resize()
    this.time += 0.016
    this._renderPass(this.prog, this.u, false)
    requestAnimationFrame(this._loop)
  }

  // regions: {key: {color:[r,g,b]|null, gloss:0~1, highlight:bool}}
  setRegions(regions) { this.regions = regions }
  setSelected(key) { this.selected = key }
  dispose() { this._running = false }
}
