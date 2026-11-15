/*
 * geo-scene.js — 三维地形场景（three.js r157 全局构建版）
 * 负责：程序化山地地形、等高线、坡度渲染、D8 汇水线、隐患点圈定与渲染、民房与陡坡预警查询
 * 纯数学函数挂在 GeoScene.math 上，可在 Node 中脱离 three.js 单测
 */
(function (global) {
  'use strict';

  var SIZE = 600;          // 地形边长（米）
  var SEG = 170;           // 地形网格细分
  var HYDRO_GRID = 100;    // D8 汇水网格分辨率
  var CONTOUR_GRID = 120;  // 等高线计算网格
  var RED_SLOPE = 35;      // 陡坡阈值（度）
  var HOUSE_DIST = 10;     // 下方民房距离阈值（米）

  /* ---------------- 确定性随机与噪声 ---------------- */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hash2(ix, iz) {
    var n = Math.sin(ix * 127.1 + iz * 311.7) * 43758.5453123;
    return n - Math.floor(n);
  }

  function vnoise(x, z) {
    var ix = Math.floor(x), iz = Math.floor(z);
    var fx = x - ix, fz = z - iz;
    var ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
    var a = hash2(ix, iz), b = hash2(ix + 1, iz);
    var c = hash2(ix, iz + 1), d = hash2(ix + 1, iz + 1);
    return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
  }

  function fbm(x, z) {
    var v = 0, amp = 0.5, f = 1;
    for (var o = 0; o < 4; o++) {
      v += amp * vnoise(x * f, z * f);
      f *= 2.07; amp *= 0.5;
    }
    return v;
  }

  /* ---------------- 地形高程（程序化山地） ---------------- */
  function heightAt(x, z) {
    var n1 = fbm(x * 0.0062 + 11.3, z * 0.0062 + 7.7);
    var n2 = fbm(x * 0.021 + 40.1, z * 0.021 + 3.2);
    var h = 20
      + 66 * n1
      + 16 * Math.sin(x * 0.011 + z * 0.008)
      + 11 * Math.cos(z * 0.016 - x * 0.004)
      + 11 * n2;
    return h;
  }

  function slopeAt(x, z) {
    var d = 3;
    var dx = (heightAt(x + d, z) - heightAt(x - d, z)) / (2 * d);
    var dz = (heightAt(x, z + d) - heightAt(x, z - d)) / (2 * d);
    return Math.atan(Math.sqrt(dx * dx + dz * dz)) * 180 / Math.PI;
  }

  function centroidOf(points) {
    var x = 0, z = 0;
    points.forEach(function (p) { x += p.x; z += p.z; });
    return { x: x / points.length, z: z / points.length };
  }

  function polygonArea(points) {
    var a = 0;
    for (var i = 0, j = points.length - 1; i < points.length; j = i++) {
      a += points[j].x * points[i].z - points[i].x * points[j].z;
    }
    return Math.abs(a / 2);
  }

  function pointInPolygon(x, z, pts) {
    var inside = false;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      var xi = pts[i].x, zi = pts[i].z, xj = pts[j].x, zj = pts[j].z;
      if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  function distPointToSeg(px, pz, a, b) {
    var dx = b.x - a.x, dz = b.z - a.z;
    var l2 = dx * dx + dz * dz;
    if (l2 === 0) return Math.hypot(px - a.x, pz - a.z);
    var t = ((px - a.x) * dx + (pz - a.z) * dz) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (a.x + t * dx), pz - (a.z + t * dz));
  }

  function distToPolygon(x, z, pts) {
    if (pointInPolygon(x, z, pts)) return 0;
    var min = Infinity;
    for (var i = 0; i < pts.length; i++) {
      var d = distPointToSeg(x, z, pts[i], pts[(i + 1) % pts.length]);
      if (d < min) min = d;
    }
    return min;
  }

  /* ---------------- D8 汇水累积 ---------------- */
  function buildFlowGrid() {
    var n = HYDRO_GRID, cell = SIZE / n;
    var h = new Float32Array(n * n);
    var down = new Int32Array(n * n);
    var acc = new Float64Array(n * n);
    var i, j;
    for (j = 0; j < n; j++) {
      for (i = 0; i < n; i++) {
        var wx = -SIZE / 2 + (i + 0.5) * cell;
        var wz = -SIZE / 2 + (j + 0.5) * cell;
        h[j * n + i] = heightAt(wx, wz);
        acc[j * n + i] = 1;
        down[j * n + i] = -1;
      }
    }
    var order = [];
    for (i = 0; i < n * n; i++) order.push(i);
    order.sort(function (a, b) { return h[b] - h[a]; });
    var dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142]];
    for (var k = 0; k < order.length; k++) {
      var idx = order[k];
      var ci = idx % n, cj = (idx / n) | 0;
      var best = -1, bestSlope = 0;
      for (var d = 0; d < 8; d++) {
        var ni = ci + dirs[d][0], nj = cj + dirs[d][1];
        if (ni < 0 || nj < 0 || ni >= n || nj >= n) continue;
        var nidx = nj * n + ni;
        var drop = (h[idx] - h[nidx]) / (cell * dirs[d][2]);
        if (drop > bestSlope) { bestSlope = drop; best = nidx; }
      }
      down[idx] = best;
    }
    for (k = 0; k < order.length; k++) {
      idx = order[k];
      if (down[idx] >= 0) acc[down[idx]] += acc[idx];
    }
    return { n: n, cell: cell, h: h, down: down, acc: acc };
  }

  function catchAt(flow, x, z) {
    var n = flow.n, cell = flow.cell;
    var i = Math.floor((x + SIZE / 2) / cell), j = Math.floor((z + SIZE / 2) / cell);
    i = Math.max(0, Math.min(n - 1, i));
    j = Math.max(0, Math.min(n - 1, j));
    return flow.acc[j * n + i] * cell * cell;
  }

  /* 在陡坡（36°~44°）下坡方向 8m 处布置民房，保证红色复核场景可演示 */
  function findSteepHouseSites(rng, count) {
    var sites = [], tries = 0;
    while (sites.length < count && tries++ < 4000) {
      var fx = (rng() - 0.5) * SIZE * 0.9, fz = (rng() - 0.5) * SIZE * 0.9;
      var s = slopeAt(fx, fz);
      if (s < 36 || s > 44) continue;
      var d = 3;
      var dx = (heightAt(fx + d, fz) - heightAt(fx - d, fz)) / (2 * d);
      var dz = (heightAt(fx, fz + d) - heightAt(fx, fz - d)) / (2 * d);
      var len = Math.hypot(dx, dz) || 1;
      var hx = fx - (dx / len) * 8, hz = fz - (dz / len) * 8;
      if (Math.abs(hx) > SIZE / 2 - 20 || Math.abs(hz) > SIZE / 2 - 20) continue;
      if (sites.some(function (t) { return Math.hypot(t.house.x - hx, t.house.z - hz) < 20; })) continue;
      sites.push({
        steep: { x: Math.round(fx * 10) / 10, z: Math.round(fz * 10) / 10 },
        house: { x: Math.round(hx * 10) / 10, z: Math.round(hz * 10) / 10 },
        slope: Math.round(s * 10) / 10
      });
    }
    return sites;
  }

  var math = {
    SIZE: SIZE, SEG: SEG, RED_SLOPE: RED_SLOPE, HOUSE_DIST: HOUSE_DIST,
    mulberry32: mulberry32, heightAt: heightAt, slopeAt: slopeAt,
    centroidOf: centroidOf, polygonArea: polygonArea, distToPolygon: distToPolygon,
    buildFlowGrid: buildFlowGrid, catchAt: catchAt, findSteepHouseSites: findSteepHouseSites
  };

  // Node 环境下仅导出数学函数
  if (typeof global.THREE === 'undefined') {
    global.GeoScene = { math: math };
    return;
  }
  var THREE = global.THREE;

  /* ================= 三维场景类 ================= */
  function GeoScene(container, callbacks) {
    this.container = container;
    this.cb = callbacks || {};
    this.houses = [];
    this.hazards = [];
    this.selectedId = null;
    this.mode = 'none';           // none | draw | house
    this.drawPts = [];
    this.colorMode = 'elevation';
    this.layers = { contours: true, flow: false, houses: true };
    this.pulseT = 0;
    this._buildRenderer();
    this._buildScene();
    this._buildTerrain();
    this.flow = buildFlowGrid();
    this._buildContours();
    this._buildFlowLines();
    this._seedHouses();
    this._buildHazardsGroup();
    this._buildDrawPreview();
    this._bindEvents();
    this._loop = this._renderLoop.bind(this);
    this._running = true;
    requestAnimationFrame(this._loop);
  }

  GeoScene.prototype._buildRenderer = function () {
    var w = this.container.clientWidth || 800, h = this.container.clientHeight || 600;
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xbcd4ea);
    this.scene.fog = new THREE.Fog(0xbcd4ea, 650, 1300);
    this.camera = new THREE.PerspectiveCamera(52, w / h, 1, 3000);
    this.target = new THREE.Vector3(0, 55, 0);
    this.radius = 560; this.azimuth = 0.7; this.polar = 0.92;
    this._updateCamera();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
  };

  GeoScene.prototype._buildScene = function () {
    var hemi = new THREE.HemisphereLight(0xdfefff, 0x6b7a5a, 0.95);
    var sun = new THREE.DirectionalLight(0xfff4e0, 1.35);
    sun.position.set(260, 420, 180);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -380; sun.shadow.camera.right = 380;
    sun.shadow.camera.top = 380; sun.shadow.camera.bottom = -380;
    sun.shadow.camera.far = 1200;
    this.scene.add(hemi);
    this.scene.add(sun);
    // 底座地面
    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(2600, 2600),
      new THREE.MeshStandardMaterial({ color: 0x9fb48c, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -14;
    ground.receiveShadow = true;
    this.scene.add(ground);
    // 指北针
    var north = this._makeLabel('N', 0xc0392b, 40);
    north.position.set(-SIZE / 2 + 30, 130, -SIZE / 2 + 30);
    north.scale.set(26, 26, 1);
    this.scene.add(north);
  };

  GeoScene.prototype._elevationColor = function (hv, minH, maxH) {
    var t = (hv - minH) / (maxH - minH);
    var stops = [[0.36, 0.55, 0.30], [0.55, 0.62, 0.34], [0.62, 0.50, 0.34], [0.55, 0.42, 0.34], [0.82, 0.80, 0.74]];
    var f = Math.max(0, Math.min(0.9999, t)) * (stops.length - 1);
    var i = Math.min(stops.length - 2, Math.floor(f)), u = f - i;
    var a = stops[i], b = stops[i + 1];
    return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
  };

  GeoScene.prototype._slopeColor = function (deg) {
    var stops = [
      [15, [0.34, 0.66, 0.34]], [25, [0.83, 0.78, 0.30]],
      [35, [0.90, 0.55, 0.20]], [45, [0.83, 0.27, 0.20]], [90, [0.66, 0.18, 0.16]]
    ];
    if (deg <= stops[0][0]) return [0.34, 0.66, 0.34];
    for (var i = 0; i < stops.length - 1; i++) {
      if (deg <= stops[i + 1][0]) {
        var u = (deg - stops[i][0]) / (stops[i + 1][0] - stops[i][0]);
        var a = stops[i][1], b = stops[i + 1][1];
        return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
      }
    }
    return stops[stops.length - 1][1];
  };

  GeoScene.prototype._buildTerrain = function () {
    var geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    geo.rotateX(-Math.PI / 2);
    var pos = geo.attributes.position;
    var elevColors = new Float32Array(pos.count * 3);
    var slopeColors = new Float32Array(pos.count * 3);
    var minH = Infinity, maxH = -Infinity;
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i), z = pos.getZ(i);
      var y = heightAt(x, z);
      pos.setY(i, y);
      if (y < minH) minH = y;
      if (y > maxH) maxH = y;
    }
    this.minH = minH; this.maxH = maxH;
    for (i = 0; i < pos.count; i++) {
      x = pos.getX(i); z = pos.getZ(i); y = pos.getY(i);
      var ec = this._elevationColor(y, minH, maxH);
      var sc = this._slopeColor(slopeAt(x, z));
      elevColors.set(ec, i * 3);
      slopeColors.set(sc, i * 3);
    }
    this.elevColors = elevColors;
    this.slopeColors = slopeColors;
    geo.setAttribute('color', new THREE.BufferAttribute(elevColors.slice(), 3));
    geo.computeVertexNormals();
    var mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0.02, flatShading: false });
    this.terrain = new THREE.Mesh(geo, mat);
    this.terrain.receiveShadow = true;
    this.terrain.name = 'terrain';
    this.scene.add(this.terrain);
  };

  GeoScene.prototype.setColorMode = function (mode) {
    this.colorMode = mode;
    var attr = this.terrain.geometry.getAttribute('color');
    var src = mode === 'slope' ? this.slopeColors : this.elevColors;
    attr.array.set(src);
    attr.needsUpdate = true;
  };

  /* ---------------- 等高线 ---------------- */
  GeoScene.prototype._buildContours = function () {
    var n = CONTOUR_GRID, cell = SIZE / n;
    var minL = Math.ceil(this.minH / 10) * 10, maxL = Math.floor(this.maxH / 10) * 10;
    var minor = [], major = [];
    function seg(arr, x1, z1, y1, x2, z2, y2) {
      arr.push(x1, y1, z1, x2, y2, z2);
    }
    function iso(arr, ax, az, ah, bx, bz, bh, level) {
      var t = (level - ah) / (bh - ah);
      seg(arr, ax + (bx - ax) * t, az + (bz - az) * t, level + 0.9, 0, 0, 0);
    }
    var hh = new Float32Array((n + 1) * (n + 1));
    for (var j = 0; j <= n; j++) {
      for (var i = 0; i <= n; i++) {
        var wx = -SIZE / 2 + i * cell, wz = -SIZE / 2 + j * cell;
        hh[j * (n + 1) + i] = heightAt(wx, wz);
      }
    }
    for (var level = minL; level <= maxL; level += 10) {
      var target = (level % 50 === 0) ? major : minor;
      for (j = 0; j < n; j++) {
        for (i = 0; i < n; i++) {
          var i0 = j * (n + 1) + i, i1 = i0 + 1, i2 = i0 + (n + 1), i3 = i2 + 1;
          var p0 = [hh[i0], -SIZE / 2 + i * cell, -SIZE / 2 + j * cell];
          var p1 = [hh[i1], -SIZE / 2 + (i + 1) * cell, -SIZE / 2 + j * cell];
          var p2 = [hh[i2], -SIZE / 2 + i * cell, -SIZE / 2 + (j + 1) * cell];
          var p3 = [hh[i3], -SIZE / 2 + (i + 1) * cell, -SIZE / 2 + (j + 1) * cell];
          var tris = [[p0, p1, p3], [p0, p3, p2]];
          for (var tI = 0; tI < 2; tI++) {
            var tri = tris[tI], hits = [];
            for (var e = 0; e < 3; e++) {
              var A = tri[e], B = tri[(e + 1) % 3];
              if ((A[0] - level) * (B[0] - level) < 0) {
                var tt = (level - A[0]) / (B[0] - A[0]);
                hits.push([A[1] + (B[1] - A[1]) * tt, A[2] + (B[2] - A[2]) * tt]);
              }
            }
            if (hits.length === 2) seg(target, hits[0][0], hits[0][1], level + 0.9, hits[1][0], hits[1][1], level + 0.9);
          }
        }
      }
    }
    var minorGeo = new THREE.BufferGeometry();
    minorGeo.setAttribute('position', new THREE.Float32BufferAttribute(minor, 3));
    this.contourMinor = new THREE.LineSegments(minorGeo, new THREE.LineBasicMaterial({ color: 0x5d6d4a, transparent: true, opacity: 0.45 }));
    var majorGeo = new THREE.BufferGeometry();
    majorGeo.setAttribute('position', new THREE.Float32BufferAttribute(major, 3));
    this.contourMajor = new THREE.LineSegments(majorGeo, new THREE.LineBasicMaterial({ color: 0x3a4632, transparent: true, opacity: 0.8 }));
    this.scene.add(this.contourMinor);
    this.scene.add(this.contourMajor);
  };

  /* ---------------- 汇水线 ---------------- */
  GeoScene.prototype._buildFlowLines = function () {
    var n = this.flow.n, cell = this.flow.cell, pos = [];
    for (var j = 0; j < n; j++) {
      for (var i = 0; i < n; i++) {
        var idx = j * n + i, d = this.flow.down[idx];
        if (d < 0 || this.flow.acc[idx] < 25) continue;
        var x = -SIZE / 2 + (i + 0.5) * cell, z = -SIZE / 2 + (j + 0.5) * cell;
        var ni = d % n, nj = (d / n) | 0;
        var x2 = -SIZE / 2 + (ni + 0.5) * cell, z2 = -SIZE / 2 + (nj + 0.5) * cell;
        pos.push(x, heightAt(x, z) + 1.4, z, x2, heightAt(x2, z2) + 1.4, z2);
      }
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    this.flowLines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x1f6feb, transparent: true, opacity: 0.65 }));
    this.flowLines.visible = false;
    this.scene.add(this.flowLines);
  };

  /* ---------------- 民房 ---------------- */
  GeoScene.prototype._makeHouse = function (x, z, id) {
    var y = heightAt(x, z);
    var g = new THREE.Group();
    var wall = new THREE.Mesh(new THREE.BoxGeometry(9, 5, 8),
      new THREE.MeshStandardMaterial({ color: 0xf2ede2, roughness: 0.9 }));
    wall.position.y = 2.5; wall.castShadow = true;
    var roof = new THREE.Mesh(new THREE.ConeGeometry(7.2, 3.4, 4),
      new THREE.MeshStandardMaterial({ color: 0x9e4a3a, roughness: 0.85 }));
    roof.rotation.y = Math.PI / 4; roof.position.y = 6.7; roof.castShadow = true;
    g.add(wall); g.add(roof);
    g.position.set(x, y, z);
    g.userData = { houseId: id, x: x, z: z, y: y, wall: wall, roof: roof, beacon: null };
    return g;
  };

  GeoScene.prototype._seedHouses = function () {
    var rng = mulberry32(20261116);
    this.houseGroup = new THREE.Group();
    this.scene.add(this.houseGroup);
    // 先在陡坡下坡方向布置 2 栋强制演示民房（红色复核场景）
    this.steepSites = math.findSteepHouseSites(rng, 2);
    var self = this;
    this.steepSites.forEach(function (site) {
      var house = self._makeHouse(site.house.x, site.house.z, 'H' + String(self.houses.length + 1).padStart(2, '0'));
      house.userData.forced = true;
      self.houses.push(house.userData);
      self.houseGroup.add(house);
    });
    var centers = [];
    for (var c = 0; c < 4; c++) {
      var cx = 0, cz = 0, ok = false, tries = 0;
      while (!ok && tries++ < 80) {
        cx = (rng() - 0.5) * SIZE * 0.78; cz = (rng() - 0.5) * SIZE * 0.78;
        ok = slopeAt(cx, cz) < 16;
      }
      centers.push([cx, cz]);
    }
    var id = 0;
    while (this.houses.length < 28 && id < 400) {
      id++;
      var cc = centers[(rng() * centers.length) | 0];
      var x = cc[0] + (rng() + rng() + rng() - 1.5) * 52;
      var z = cc[1] + (rng() + rng() + rng() - 1.5) * 52;
      if (Math.abs(x) > SIZE / 2 - 25 || Math.abs(z) > SIZE / 2 - 25) continue;
      if (slopeAt(x, z) > 19) continue;
      if (this.houses.some(function (h2) { return Math.hypot(h2.x - x, h2.z - z) < 16; })) continue;
      var house2 = this._makeHouse(x, z, 'H' + String(this.houses.length + 1).padStart(2, '0'));
      this.houses.push(house2.userData);
      this.houseGroup.add(house2);
    }
  };

  GeoScene.prototype.addHouseAt = function (x, z) {
    if (Math.abs(x) > SIZE / 2 - 10 || Math.abs(z) > SIZE / 2 - 10) return null;
    var house = this._makeHouse(x, z, 'H' + String(this.houses.length + 1).padStart(2, '0'));
    this.houses.push(house.userData);
    this.houseGroup.add(house);
    return house.userData;
  };

  GeoScene.prototype.serializeHouses = function () {
    return this.houses.map(function (h) { return { x: h.x, z: h.z }; });
  };

  GeoScene.prototype.loadHouses = function (list) {
    var self = this;
    this.houseGroup.clear();
    this.houses = [];
    list.forEach(function (p, i) {
      var house = self._makeHouse(p.x, p.z, 'H' + String(i + 1).padStart(2, '0'));
      self.houses.push(house.userData);
      self.houseGroup.add(house);
    });
    this.refreshHazards();
  };

  /* ---------------- 隐患点渲染 ---------------- */
  var STATUS_COLORS = {
    '待核查': 0xe6a23c, '待审核': 0x409eff, '已退回': 0x909399,
    '待复核': 0xe65d3f, '已确认': 0x67c23a, '已销号': 0x909399
  };

  GeoScene.prototype._makeLabel = function (text, color, fontSize) {
    var canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 96;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(8, 16, 240, 64, 12); ctx.fill(); }
    else { ctx.fillRect(8, 16, 240, 64); }
    ctx.fillStyle = '#fff';
    ctx.font = 'bold ' + (fontSize || 38) + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 49);
    var tex = new THREE.CanvasTexture(canvas);
    var sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    sprite.scale.set(30, 11, 1);
    return sprite;
  };

  GeoScene.prototype._buildHazardsGroup = function () {
    this.hazardGroup = new THREE.Group();
    this.scene.add(this.hazardGroup);
    this.flagBeacons = [];
  };

  GeoScene.prototype._hazardMesh = function (hz) {
    var self = this;
    var g = new THREE.Group();
    var color = STATUS_COLORS[hz.status] || 0x409eff;
    var shape = new THREE.Shape();
    hz.polygon.forEach(function (p, i) {
      if (i === 0) shape.moveTo(p.x, p.z); else shape.lineTo(p.x, p.z);
    });
    var fillGeo = new THREE.ShapeGeometry(shape);
    fillGeo.rotateX(Math.PI / 2);
    var pAttr = fillGeo.attributes.position;
    for (var i = 0; i < pAttr.count; i++) {
      pAttr.setY(i, heightAt(pAttr.getX(i), pAttr.getZ(i)) + 1.3);
    }
    var fill = new THREE.Mesh(fillGeo, new THREE.MeshBasicMaterial({
      color: hz.redFlag ? 0xe5484d : color, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false
    }));
    g.add(fill);
    var linePts = hz.polygon.map(function (p) {
      return new THREE.Vector3(p.x, heightAt(p.x, p.z) + 1.5, p.z);
    });
    linePts.push(linePts[0].clone());
    var line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(linePts),
      new THREE.LineBasicMaterial({ color: hz.redFlag ? 0xff2d2d : color }));
    g.add(line);
    var c = hz.centroid;
    var marker = new THREE.Mesh(new THREE.SphereGeometry(3.2, 16, 12),
      new THREE.MeshStandardMaterial({ color: hz.redFlag ? 0xff2d2d : color, emissive: 0x000000 }));
    marker.position.set(c.x, heightAt(c.x, c.z) + 6, c.z);
    marker.userData.hazardId = hz.id;
    g.add(marker);
    var label = this._makeLabel(hz.code, hz.redFlag ? 0xc81e1e : color);
    label.position.set(c.x, heightAt(c.x, c.z) + 20, c.z);
    label.userData.hazardId = hz.id;
    g.add(label);
    if (hz.redFlag) {
      var ring = new THREE.Mesh(new THREE.RingGeometry(14, 17, 40),
        new THREE.MeshBasicMaterial({ color: 0xff2d2d, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(c.x, heightAt(c.x, c.z) + 1.7, c.z);
      ring.userData.isPulse = true;
      g.add(ring);
      this.flagBeacons.push(ring);
      // 受威胁民房红色警示
      hz.nearHouses.forEach(function (hid) {
        var hd = self.houses.find(function (h2) { return h2.houseId === hid; });
        if (!hd || hd.beacon) return;
        hd.wall.material.color.setHex(0xffd2d2);
        hd.roof.material.color.setHex(0xd32020);
        var beacon = new THREE.Mesh(new THREE.SphereGeometry(1.6, 10, 8),
          new THREE.MeshBasicMaterial({ color: 0xff2d2d }));
        beacon.position.set(hd.x, hd.y + 10, hd.z);
        beacon.userData.isPulse = true;
        self.houseGroup.add(beacon);
        hd.beacon = beacon;
      });
    }
    if (hz.id === this.selectedId) {
      var sel = new THREE.Mesh(new THREE.RingGeometry(10, 11.5, 36),
        new THREE.MeshBasicMaterial({ color: 0xffd400, side: THREE.DoubleSide, transparent: true, opacity: 0.95, depthWrite: false }));
      sel.rotation.x = -Math.PI / 2;
      sel.position.set(c.x, heightAt(c.x, c.z) + 1.8, c.z);
      g.add(sel);
      marker.material.emissive.setHex(0x664d00);
    }
    g.userData.hazardId = hz.id;
    return g;
  };

  GeoScene.prototype.setHazards = function (list) {
    this.hazards = list;
    this.refreshHazards();
  };

  GeoScene.prototype.refreshHazards = function () {
    // 复位民房外观
    this.houses.forEach(function (hd) {
      hd.wall.material.color.setHex(0xf2ede2);
      hd.roof.material.color.setHex(0x9e4a3a);
      if (hd.beacon) { hd.beacon.parent && hd.beacon.parent.remove(hd.beacon); hd.beacon = null; }
    });
    this.hazardGroup.clear();
    this.flagBeacons = [];
    var self = this;
    this.hazards.forEach(function (hz) {
      self.hazardGroup.add(self._hazardMesh(hz));
    });
  };

  GeoScene.prototype.selectHazard = function (id) {
    this.selectedId = id;
    this.refreshHazards();
    var hz = this.hazards.find(function (h2) { return h2.id === id; });
    if (hz) this.flyTo(hz.centroid.x, hz.centroid.z);
  };

  GeoScene.prototype.flyTo = function (x, z) {
    this._fly = { t: 0, fromTarget: this.target.clone(), toTarget: new THREE.Vector3(x, heightAt(x, z) + 12, z),
      fromR: this.radius, toR: Math.min(this.radius, 240) };
  };

  /* ---------------- 陡坡/民房复核查询 ---------------- */
  GeoScene.prototype.evaluateSite = function (polygon) {
    var c = math.centroidOf(polygon);
    var slope = slopeAt(c.x, c.z);
    var meanH = polygon.reduce(function (s, p) { return s + heightAt(p.x, p.z); }, 0) / polygon.length;
    var near = [];
    if (slope > RED_SLOPE) {
      for (var i = 0; i < this.houses.length; i++) {
        var hd = this.houses[i];
        if (hd.y <= meanH + 1 && math.distToPolygon(hd.x, hd.z, polygon) <= HOUSE_DIST) {
          near.push(hd.houseId);
        }
      }
    }
    return {
      centroid: c,
      slope: Math.round(slope * 10) / 10,
      catchArea: Math.round(catchAt(this.flow, c.x, c.z)),
      area: Math.round(math.polygonArea(polygon)),
      redFlag: slope > RED_SLOPE && near.length > 0,
      nearHouses: near
    };
  };

  /* ---------------- 圈定交互 ---------------- */
  GeoScene.prototype._buildDrawPreview = function () {
    this.drawGroup = new THREE.Group();
    this.drawGroup.visible = false;
    this.scene.add(this.drawGroup);
    this.drawLine = new THREE.Line(new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0xffd400 }));
    this.drawGroup.add(this.drawLine);
    this.vertGroup = new THREE.Group();
    this.drawGroup.add(this.vertGroup);
  };

  GeoScene.prototype.startDraw = function () {
    this.mode = 'draw';
    this.drawPts = [];
    this.drawGroup.visible = true;
    this._updateDrawPreview(null);
    this.container.style.cursor = 'crosshair';
  };

  GeoScene.prototype.cancelDraw = function () {
    this.mode = 'none';
    this.drawPts = [];
    this.drawGroup.visible = false;
    this.container.style.cursor = '';
  };

  GeoScene.prototype.finishDraw = function () {
    if (this.drawPts.length < 3) return null;
    var pts = this.drawPts.slice();
    this.cancelDraw();
    return pts;
  };

  GeoScene.prototype._updateDrawPreview = function (cursor) {
    var pts = this.drawPts.slice();
    if (cursor) pts.push(cursor);
    if (pts.length >= 2) {
      var v = pts.map(function (p) { return new THREE.Vector3(p.x, heightAt(p.x, p.z) + 2, p.z); });
      if (this.drawPts.length >= 3) v.push(v[0].clone());
      this.drawLine.geometry.dispose();
      this.drawLine.geometry = new THREE.BufferGeometry().setFromPoints(v);
    }
    this.vertGroup.clear();
    var self = this;
    this.drawPts.forEach(function (p) {
      var s = new THREE.Mesh(new THREE.SphereGeometry(1.8, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xffd400 }));
      s.position.set(p.x, heightAt(p.x, p.z) + 2, p.z);
      self.vertGroup.add(s);
    });
  };

  /* ---------------- 鼠标/触控与轨道控制 ---------------- */
  GeoScene.prototype._bindEvents = function () {
    var self = this;
    var el = this.renderer.domElement;
    var down = null, dragging = false;
    var pointers = new Map();
    var pinchDist = 0;

    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    el.addEventListener('pointerdown', function (e) {
      el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        down = { x: e.clientX, y: e.clientY, button: e.button };
        dragging = false;
      } else if (pointers.size === 2) {
        var arr = Array.from(pointers.values());
        pinchDist = Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y);
      }
    });

    el.addEventListener('pointermove', function (e) {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        arr = Array.from(pointers.values());
        var d = Math.hypot(arr[0].x - arr[1].x, arr[0].y - arr[1].y);
        if (pinchDist > 0) self.radius = Math.max(90, Math.min(950, self.radius * pinchDist / d));
        pinchDist = d;
        return;
      }
      if (!down) {
        if (self.mode === 'draw') {
          var hit = self._pickTerrain(e);
          if (hit) self._updateDrawPreview({ x: hit.x, z: hit.z });
        }
        return;
      }
      var dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (Math.abs(dx) + Math.abs(dy) > 5) dragging = true;
      if (dragging) {
        if (down.button === 2 || down.button === 1) {
          self._pan(dx, dy);
        } else {
          self.azimuth -= dx * 0.005;
          self.polar = Math.max(0.12, Math.min(1.48, self.polar - dy * 0.005));
        }
        down.x = e.clientX; down.y = e.clientY;
      }
    });

    el.addEventListener('pointerup', function (e) {
      var wasDragging = dragging;
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchDist = 0;
      if (pointers.size === 0) down = null;
      if (wasDragging || pointers.size > 0) return;
      self._handleClick(e);
    });

    el.addEventListener('wheel', function (e) {
      e.preventDefault();
      self.radius = Math.max(90, Math.min(950, self.radius * (1 + e.deltaY * 0.0011)));
    }, { passive: false });

    el.addEventListener('dblclick', function (e) {
      if (self.mode === 'draw') {
        e.preventDefault();
        if (self.drawPts.length >= 3 && self.cb.onDrawComplete) {
          var pts = self.finishDraw();
          if (pts) self.cb.onDrawComplete(pts);
        }
      }
    });

    this._resizeObs = new ResizeObserver(function () { self.resize(); });
    this._resizeObs.observe(this.container);
  };

  GeoScene.prototype._pan = function (dx, dy) {
    var scale = this.radius * 0.0016;
    var right = new THREE.Vector3();
    right.setFromMatrixColumn(this.camera.matrix, 0);
    right.y = 0; right.normalize();
    var fwd = new THREE.Vector3();
    this.camera.getWorldDirection(fwd);
    fwd.y = 0; fwd.normalize();
    this.target.addScaledVector(right, -dx * scale);
    this.target.addScaledVector(fwd, dy * scale);
  };

  GeoScene.prototype._setPointer = function (e) {
    var rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  };

  GeoScene.prototype._pickTerrain = function (e) {
    this._setPointer(e);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    var hit = this.raycaster.intersectObject(this.terrain, false)[0];
    return hit ? hit.point : null;
  };

  GeoScene.prototype._handleClick = function (e) {
    this._setPointer(e);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    if (this.mode === 'draw') {
      var p = this.raycaster.intersectObject(this.terrain, false)[0];
      if (p) {
        this.drawPts.push({ x: Math.round(p.point.x * 10) / 10, z: Math.round(p.point.z * 10) / 10 });
        this._updateDrawPreview({ x: p.point.x, z: p.point.z });
        if (this.cb.onDrawPoint) this.cb.onDrawPoint(this.drawPts.length);
      }
      return;
    }
    if (this.mode === 'house') {
      var ph = this.raycaster.intersectObject(this.terrain, false)[0];
      if (ph && this.cb.onPlaceHouse) this.cb.onPlaceHouse(ph.point.x, ph.point.z);
      return;
    }
    var markers = [];
    this.hazardGroup.children.forEach(function (g) {
      g.children.forEach(function (m) {
        if (m.userData.hazardId) markers.push(m);
      });
    });
    var hm = this.raycaster.intersectObjects(markers, false)[0];
    if (hm && this.cb.onSelect) {
      this.cb.onSelect(hm.object.userData.hazardId);
      return;
    }
    if (this.cb.onSelect) this.cb.onSelect(null);
  };

  GeoScene.prototype.setLayer = function (name, visible) {
    this.layers[name] = visible;
    if (name === 'contours') {
      this.contourMinor.visible = visible;
      this.contourMajor.visible = visible;
    }
    if (name === 'flow') this.flowLines.visible = visible;
    if (name === 'houses') this.houseGroup.visible = visible;
  };

  GeoScene.prototype._updateCamera = function () {
    var sp = Math.sin(this.polar), cp = Math.cos(this.polar);
    this.camera.position.set(
      this.target.x + this.radius * sp * Math.sin(this.azimuth),
      this.target.y + this.radius * cp,
      this.target.z + this.radius * sp * Math.cos(this.azimuth)
    );
    this.camera.lookAt(this.target);
  };

  GeoScene.prototype.resize = function () {
    var w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  GeoScene.prototype._renderLoop = function () {
    if (!this._running) return;
    requestAnimationFrame(this._loop);
    this.pulseT += 0.04;
    var k = 1 + 0.18 * Math.sin(this.pulseT);
    var now = performance.now();
    this.flagBeacons.forEach(function (r) {
      r.scale.set(k, k, 1);
      r.material.opacity = 0.45 + 0.4 * (0.5 + 0.5 * Math.sin(now * 0.004));
    });
    this.houses.forEach(function (hd) {
      if (hd.beacon) { var s2 = 1 + 0.25 * Math.sin(now * 0.006); hd.beacon.scale.set(s2, s2, s2); }
    });
    if (this._fly) {
      this._fly.t += 0.04;
      var t = Math.min(1, this._fly.t);
      var e = 1 - Math.pow(1 - t, 3);
      this.target.lerpVectors(this._fly.fromTarget, this._fly.toTarget, e);
      this.radius = this._fly.fromR + (this._fly.toR - this._fly.fromR) * e;
      if (t >= 1) this._fly = null;
    }
    this._updateCamera();
    this.renderer.render(this.scene, this.camera);
  };

  GeoScene.prototype.dispose = function () {
    this._running = false;
    this._resizeObs && this._resizeObs.disconnect();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  };

  GeoScene.math = math;
  global.GeoScene = GeoScene;
})(typeof window !== 'undefined' ? window : globalThis);
