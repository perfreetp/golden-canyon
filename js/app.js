/*
 * app.js — Vue3 主应用：三维场景装配、5 个视图交互、工单流转、图表与导出
 */
(function () {
  'use strict';
  var { createApp, reactive, ref, computed, watch, onMounted, nextTick, h: _h } = Vue;

  /* ---------------- 照片上传组件（FileReader 转 dataURL） ---------------- */
  var PhotoUpload = {
    props: { photos: { type: Array, required: true }, cap: { type: String, default: '上传现场照片' } },
    emits: ['add', 'remove'],
    template: `
      <div class="photo-row" style="margin:10px 0">
        <div v-for="(p, i) in photos" :key="i" class="photo-thumb">
          <img :src="p.url || p" alt="现场照片">
          <button class="ph-del" title="删除" @click="$emit('remove', i)">×</button>
          <div class="ph-cap">{{ p.name || ('照片' + (i + 1)) }}</div>
        </div>
        <label class="photo-add">
          <div style="font-size:22px">＋</div><div style="font-size:12px">{{ cap }}</div>
          <input type="file" accept="image/*" multiple style="display:none" @change="onPick($event)">
        </label>
      </div>`,
    methods: {
      onPick(e) {
        var files = Array.from(e.target.files || []);
        files.forEach((file) => {
          var reader = new FileReader();
          reader.onload = () => this.$emit('add', { url: reader.result, name: file.name });
          reader.readAsDataURL(file);
        });
        e.target.value = '';
      }
    }
  };

  /* ---------------- 隐患详情组件（审核/档案共用，含角色化操作栏） ---------------- */
  var DetailDrawer = {
    components: { PhotoUpload },
    props: ['h', 'role', 'sceneReady', 'cycle'],
    emits: ['close', 'edit', 'return', 'approve', 'resolve', 'closehz', 'submit', 'resubmit', 'checkin', 'recheck', 'update:cycle'],
    template: `
      <div>
        <div class="detail-head">
          <div>
            <div class="detail-title">{{ h.code }} {{ h.name }}</div>
            <div class="detail-tags">
              <span class="tag" :style="{ background: riskMeta[h.riskLevel].color }">{{ h.riskLevel }} {{ h.riskScore }}分</span>
              <span class="tag tag-status" :class="'st-' + statusKey(h.status)">{{ h.status }}</span>
              <span v-if="h.redFlag" class="tag tag-redflag">⚠ 红色复核点</span>
              <span class="tag tag-status st-queren">{{ h.type }}</span>
            </div>
          </div>
          <button class="close-x" @click="$emit('close')">×</button>
        </div>

        <div v-if="h.redFlag" class="alert alert-red">
          ⚠ 系统自动标红：实测坡度 {{ h.slopeDeg }}°（＞35°），坡体下方 10m 内有
          {{ h.nearHouses.length }} 栋民房（{{ h.nearHouses.join('、') }}）。
          <template v-if="h.recheckConfirmed"><br>✔ 调查员已于现场复核确认。</template>
          <template v-else><br>提交审核前必须完成现场复核确认。</template>
        </div>

        <div class="kv-grid">
          <div class="kv"><div class="k">所属乡镇</div><div class="v">{{ h.township }}</div></div>
          <div class="kv"><div class="k">实测坡度</div><div class="v" :class="{ 'text-red': h.slopeDeg > 35 }">{{ h.slopeDeg }}°</div></div>
          <div class="kv"><div class="k">坡高</div><div class="v">{{ h.slopeHeight }} m</div></div>
          <div class="kv"><div class="k">汇水面积</div><div class="v">{{ h.catchArea }} m²</div></div>
          <div class="kv"><div class="k">圈定面积</div><div class="v">{{ h.area }} m²</div></div>
          <div class="kv"><div class="k">岩土类型</div><div class="v">{{ h.soilType }}</div></div>
          <div class="kv"><div class="k">威胁户数</div><div class="v">
            <template v-if="role === 'investigator'"><input type="number" min="0" v-model.number="h.households" class="input" style="width:80px;padding:3px 6px"></template>
            <template v-else>{{ h.households }} 户</template>
          </div></div>
          <div class="kv"><div class="k">威胁人数</div><div class="v">{{ h.persons }} 人</div></div>
          <div class="kv"><div class="k">巡查周期</div><div class="v">{{ h.patrolCycle ? h.patrolCycle + ' 天' : '待派单' }}</div></div>
        </div>

        <div class="section-title">现场照片（{{ h.photos.length }}）</div>
        <div class="photo-row">
          <div v-for="(p, i) in h.photos" :key="i" class="photo-thumb">
            <img :src="p.url || p" alt="现场照片">
            <div class="ph-cap">{{ p.name || ('照片' + (i + 1)) }}</div>
          </div>
          <div v-if="!h.photos.length" class="empty" style="padding:8px">暂无照片</div>
        </div>

        <div class="section-title">撤离路线</div>
        <template v-if="role === 'investigator' && (h.status === '待核查' || h.status === '已退回')">
          <input class="input" v-model="h.evacuationRoute" placeholder="如：沿村道向南撤至中心小学安置点">
        </template>
        <template v-else>
          <div v-if="h.evacuationRoute" class="route-box">🧭 {{ h.evacuationRoute }}</div>
          <div v-else class="empty" style="padding:6px;text-align:left">尚未标注撤离路线</div>
        </template>

        <div class="section-title">巡查记录（{{ h.patrols.length }}）
          <span v-if="h.nextDueAt" style="font-size:12px;font-weight:400;color:#6b778c">下次到期：{{ h.nextDueAt }}</span>
        </div>
        <table v-if="h.patrols.length" class="table" style="margin-bottom:6px">
          <thead><tr><th>打卡时间</th><th>裂缝情况</th><th>警示牌</th><th>新增裂缝</th><th>照片</th></tr></thead>
          <tbody>
            <tr v-for="p in h.patrols" :key="p.id">
              <td style="white-space:nowrap">{{ p.at }}<br><span :class="p.onTime ? '' : 'text-red'" style="font-size:11px">{{ p.onTime ? '按期' : '逾期打卡' }}</span></td>
              <td>{{ p.crackStatus }}</td>
              <td>{{ p.signStatus }}</td>
              <td><span v-if="p.newCrack" class="text-red">⚠ 是（已触发复核）</span><span v-else>否</span></td>
              <td>{{ p.photos.length }} 张</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty" style="padding:6px;text-align:left">暂无巡查记录</div>

        <div class="section-title">变更追溯（{{ h.history.length }}）</div>
        <ul class="history-list">
          <li v-for="(e, i) in h.history" :key="i">
            <div class="h-at">{{ e.at }} · {{ e.by }}</div>
            <div class="h-action">{{ e.action }}</div>
            <div v-if="e.detail" class="h-detail">{{ e.detail }}</div>
          </li>
        </ul>

        <!-- 角色 × 状态 操作栏 -->
        <div class="action-bar">
          <!-- 调查员 -->
          <template v-if="role === 'investigator'">
            <button v-if="h.status === '待核查'" class="btn" @click="$emit('edit')">编辑判读信息</button>
            <button v-if="h.status === '待核查' && h.redFlag && !h.recheckConfirmed" class="btn btn-danger" @click="$emit('recheck')">现场复核确认</button>
            <button v-if="h.status === '待核查'" class="btn primary" @click="$emit('submit')">提交审核</button>
            <button v-if="h.status === '已退回'" class="btn primary" @click="$emit('resubmit')">补充材料并重新提交</button>
          </template>
          <!-- 审核员 -->
          <template v-if="role === 'reviewer'">
            <template v-if="h.status === '待审核'">
              <button class="btn btn-danger" @click="$emit('return')">退回补充照片/撤离路线</button>
              <label class="chk" style="margin-left:auto">巡查周期
                <select :value="cycle" @change="$emit('update:cycle', Number($event.target.value))" class="input" style="width:90px;padding:5px"><option :value="7">7 天</option><option :value="15">15 天</option></select>
              </label>
              <button class="btn primary" @click="$emit('approve')">确认并生成巡查任务</button>
            </template>
            <button v-if="h.status === '待复核'" class="btn primary" @click="$emit('resolve')">现场复核结论（恢复巡查）</button>
            <button v-if="h.status === '已确认'" class="btn btn-danger" @click="$emit('closehz')">核准销号</button>
          </template>
          <!-- 巡查员 -->
          <template v-if="role === 'patrol'">
            <button v-if="h.status === '已确认' || h.status === '待复核'" class="btn primary" @click="$emit('checkin')">巡查打卡</button>
          </template>
          <span v-if="h.status === '已销号'" class="text-red" style="align-self:center">该隐患点已销号归档</span>
        </div>
      </div>
    `,
    setup: function () {
      var G = window.GeoStore;
      function statusKey(s) {
        return { '待核查': 'daiche', '待审核': 'daishen', '已退回': 'tuihui', '待复核': 'daifuhe', '已确认': 'queren', '已销号': 'xiaohao' }[s] || 'daiche';
      }
      return { riskMeta: G.RISK_META, statusKey: statusKey };
    }
  };

  /* ---------------- 主应用 ---------------- */
  createApp({
    components: { PhotoUpload, DetailDrawer: DetailDrawer, DetailModal: DetailDrawer },
    setup: function () {
      var G = window.GeoStore;
      var store = new G.Store();
      var sceneEl = ref(null);
      var scene = null;
      var bootErr = ref('');

      // 将 store.state 响应式化，并把代理回注给 store：
      // store 内部方法（this.state.xxx）与视图读取的是同一个 reactive 代理，属性变更才能被 Vue 依赖追踪捕获
      store.state.view = 'terrain';
      var state = reactive(store.state);
      store.state = state;
      store.subscribe(function () { /* 响应式代理已覆盖数据变更，订阅仅用于三维场景等非响应式副作用 */ });

      var views = [
        { key: 'terrain', label: '三维判读', icon: '🛰' },
        { key: 'review', label: '审核工单', icon: '📋' },
        { key: 'patrol', label: '巡查打卡', icon: '📸' },
        { key: 'dashboard', label: '汇总看板', icon: '📊' },
        { key: 'ledger', label: '台账明白卡', icon: '📑' }
      ];
      var statusList = ['待核查', '待审核', '已退回', '待复核', '已确认', '已销号'];

      var selectedId = ref(null);
      var detailVisible = ref(false);
      var drawMode = ref(false);
      var houseMode = ref(false);
      var drawPointCount = ref(0);
      var colorMode = ref('elevation');
      var layers = reactive({ contours: true, flow: false, houses: true });
      var listFilter = reactive({ kw: '', township: '', status: '' });
      var formEditingId = ref(null);

      // 录入表单
      var formVisible = ref(false);
      var pendingPolygon = ref(null);
      var liveEval = ref(null);
      var hform = reactive({ name: '', type: '滑坡', township: G.TOWNSHIPS[0], households: 5, slopeHeight: 20, slopeDeg: 30, catchArea: 0, soilType: G.SOIL_TYPES[2], photos: [], evacuationRoute: '', recheckConfirmed: false });

      // 审核/巡查弹窗
      var returnVisible = ref(false);
      var returnReason = ref('');
      var approveCycle = ref(7);
      var checkinVisible = ref(false);
      var checkinTargetId = ref(null);
      var checkinForm = reactive({ crackStatus: '', signStatus: '警示牌完好', newCrack: false, photos: [], note: '' });
      var reviewTab = ref('todo');
      var cardVisible = ref(false);
      var cardH = ref(null);
      var cardEl = ref(null);
      var chartTown = ref(null);
      var chartRisk = ref(null);
      var charts = [];
      var toastState = reactive({ msg: '', type: 'info', timer: null });

      /* ---------- 启动与种子 ---------- */
      function ensureSeed() {
        if (!store.state.hazards.length) {
          // 场景尚未建立时，用数学模块独立计算一次种子所需数据
          var M = window.GeoScene.math;
          var rng = M.mulberry32(20261116);
          var steepSites = M.findSteepHouseSites(rng, 2);
          // 复刻场景民房布局（与 geo-scene.js _seedHouses 同种子同序列）
          var houses = steepSites.map(function (s) { return { x: s.house.x, z: s.house.z }; });
          var centers = [];
          for (var c = 0; c < 4; c++) {
            var cx = 0, cz = 0, ok = false, tries = 0;
            while (!ok && tries++ < 80) {
              cx = (rng() - 0.5) * M.SIZE * 0.78; cz = (rng() - 0.5) * M.SIZE * 0.78;
              ok = M.slopeAt(cx, cz) < 16;
            }
            centers.push([cx, cz]);
          }
          var id = 0;
          while (houses.length < 28 && id < 400) {
            id++;
            var cc = centers[(rng() * centers.length) | 0];
            var x = cc[0] + (rng() + rng() + rng() - 1.5) * 52;
            var z = cc[1] + (rng() + rng() + rng() - 1.5) * 52;
            if (Math.abs(x) > M.SIZE / 2 - 25 || Math.abs(z) > M.SIZE / 2 - 25) continue;
            if (M.slopeAt(x, z) > 19) continue;
            if (houses.some(function (h2) { return Math.hypot(h2.x - x, h2.z - z) < 16; })) continue;
            houses.push({ x: x, z: z });
          }
          var flow = M.buildFlowGrid();
          var evaluateFn = function (polygon) {
            var ce = M.centroidOf(polygon);
            var slope = M.slopeAt(ce.x, ce.z);
            var meanH = polygon.reduce(function (s, p) { return s + M.heightAt(p.x, p.z); }, 0) / polygon.length;
            var near = [];
            if (slope > M.RED_SLOPE) {
              houses.forEach(function (hd, i) {
                if (M.heightAt(hd.x, hd.z) <= meanH + 1 && M.distToPolygon(hd.x, hd.z, polygon) <= M.HOUSE_DIST) {
                  near.push('H' + String(i + 1).padStart(2, '0'));
                }
              });
            }
            return {
              centroid: ce, slope: Math.round(slope * 10) / 10,
              catchArea: Math.round(M.catchAt(flow, ce.x, ce.z)),
              area: Math.round(M.polygonArea(polygon)),
              redFlag: slope > M.RED_SLOPE && near.length > 0, nearHouses: near
            };
          };
          var seed = G.buildSeed(houses, steepSites, evaluateFn);
          store.reset(seed);
        }
      }

      ensureSeed();

      /* ---------- 三维场景 ---------- */
      function initScene() {
        if (scene || !sceneEl.value) return;
        scene = new window.GeoScene(sceneEl.value, {
          onSelect: function (id) {
            if (id) {
              selectedId.value = id;
              scene.selectHazard(id);
            } else {
              selectedId.value = null;
            }
          },
          onDrawPoint: function () { drawPointCount.value = scene.drawPts.length; },
          onDrawComplete: function (pts) {
            drawPointCount.value = 0;
            beginForm(pts);
          },
          onPlaceHouse: function (x, z) {
            var hd = scene.addHouseAt(x, z);
            if (hd) {
              var list = scene.serializeHouses();
              store.state.houses.splice(0, store.state.houses.length);
              store.state.houses.push.apply(store.state.houses, list);
              store.save();
              scene.refreshHazards();
              showToast('已放置民房 ' + hd.houseId, 'success');
            }
          }
        });
        if (store.state.houses.length) scene.loadHouses(store.state.houses);
        scene.setHazards(store.state.hazards);
        store.subscribe(function () { if (scene) scene.setHazards(store.state.hazards); });
      }

      onMounted(function () {
        nextTick(initScene);
        window.addEventListener('resize', resizeCharts);
      });

      function switchView(v) {
        state.view = v;
        if (v === 'terrain') nextTick(function () { scene && scene.resize(); });
        if (v === 'dashboard') nextTick(renderCharts);
      }

      var view = computed({ get: function () { return state.view; }, set: function (v) { state.view = v; } });
      var role = computed({
        get: function () { return state.role; },
        set: function (v) { store.setRole(v); }
      });
      var hazards = computed(function () { return state.hazards; });

      var badge = computed(function () {
        return {
          review: state.hazards.filter(function (h) { return h.status === '待审核'; }).length,
          recheck: state.hazards.filter(function (h) { return h.status === '待复核'; }).length
        };
      });

      /* ---------- 图层与圈定 ---------- */
      function setColorMode(m) {
        colorMode.value = m;
        scene && scene.setColorMode(m);
      }
      function toggleLayer(name, e) {
        layers[name] = e.target.checked;
        scene && scene.setLayer(name, e.target.checked);
      }
      function toggleDraw() {
        if (!scene) return;
        houseMode.value = false;
        drawMode.value = !drawMode.value;
        scene.mode = 'none';
        drawPointCount.value = 0;
        if (drawMode.value) scene.startDraw(); else scene.cancelDraw();
      }
      function toggleHouse() {
        if (!scene) return;
        if (drawMode.value) toggleDraw();
        houseMode.value = !houseMode.value;
        scene.mode = houseMode.value ? 'house' : 'none';
        scene.container.style.cursor = houseMode.value ? 'copy' : '';
        if (houseMode.value) showToast('在地形上点击放置民房，再次点击按钮退出', 'info');
      }
      var drawPts = computed(function () { return drawPointCount.value; });
      function finishDraw() {
        if (!scene || scene.drawPts.length < 3) return;
        drawPointCount.value = 0;
        beginForm(scene.finishDraw());
      }

      function beginForm(polygon) {
        var ev = scene.evaluateSite(polygon);
        liveEval.value = ev;
        pendingPolygon.value = polygon;
        Object.assign(hform, {
          name: ev.centroid ? '' : '', type: '滑坡', township: G.TOWNSHIPS[0],
          households: ev.nearHouses.length || 5,
          slopeHeight: Math.max(10, Math.round(Math.max.apply(null, polygon.map(function (p) { return window.GeoScene.math.heightAt(p.x, p.z); })) -
            Math.min.apply(null, polygon.map(function (p) { return window.GeoScene.math.heightAt(p.x, p.z); })))),
          slopeDeg: ev.slope, catchArea: ev.catchArea,
          soilType: G.SOIL_TYPES[2], photos: [], evacuationRoute: '', recheckConfirmed: false
        });
        hform.name = (hform.township) + (hform.type === '滑坡' ? '后山坡' : '危岩体') + '隐患点';
        formVisible.value = true;
      }

      var formRisk = computed(function () {
        return G.calcRisk({
          slopeDeg: Number(hform.slopeDeg) || 0,
          catchArea: Number(hform.catchArea) || 0,
          households: Number(hform.households) || 0,
          soilType: hform.soilType, slopeHeight: Number(hform.slopeHeight) || 0
        });
      });

      function onPhotoAdd(p) { hform.photos.push(p); }
      function onCheckinPhotoAdd(p) { checkinForm.photos.push(p); }

      function submitForm() {
        if (!hform.name || !(hform.households >= 0) || !hform.slopeHeight || !(hform.slopeDeg >= 0)) {
          showToast('请完整填写名称、户数、坡高与坡度', 'error'); return;
        }
        if (liveEval.value.redFlag && !hform.recheckConfirmed) {
          showToast('红色预警点须勾选现场复核确认后才能保存', 'error'); return;
        }
        // 编辑已有隐患点（调查员修改判读信息）
        if (formEditingId.value) {
          var old = store.get(formEditingId.value);
          store.updateHazard(formEditingId.value, {
            name: hform.name, type: hform.type, township: hform.township,
            households: Number(hform.households), slopeHeight: Number(hform.slopeHeight),
            slopeDeg: Number(hform.slopeDeg), catchArea: Number(hform.catchArea),
            soilType: hform.soilType, photos: hform.photos, evacuationRoute: hform.evacuationRoute,
            recheckConfirmed: hform.recheckConfirmed
          }, '修改判读信息', '坡度 ' + hform.slopeDeg + '°，' + hform.households + '户，重评风险 ' + G.calcRisk({
            slopeDeg: Number(hform.slopeDeg), catchArea: Number(hform.catchArea),
            households: Number(hform.households), soilType: hform.soilType, slopeHeight: Number(hform.slopeHeight)
          }).level);
          showToast(old.code + ' 判读信息已更新', 'success');
          formVisible.value = false;
          formEditingId.value = null;
          return;
        }
        var h = store.createHazard({
          name: hform.name, type: hform.type, township: hform.township,
          households: Number(hform.households), slopeHeight: Number(hform.slopeHeight),
          soilType: hform.soilType, photos: hform.photos,
          evacuationRoute: hform.evacuationRoute, polygon: pendingPolygon.value
        }, liveEval.value);
        if (liveEval.value.redFlag) store.confirmRecheck(h.id);
        formVisible.value = false;
        drawMode.value = false;
        showToast('隐患点 ' + h.code + ' 已圈定录入，风险等级：' + h.riskLevel, 'success');
        nextTick(function () { scene && scene.selectHazard(h.id); selectedId.value = h.id; });
      }
      function cancelForm() {
        formVisible.value = false;
        pendingPolygon.value = null;
        formEditingId.value = null;
        if (scene && scene.mode === 'draw') scene.cancelDraw();
        drawMode.value = false;
        drawPointCount.value = 0;
      }

      /* ---------- 列表/选择 ---------- */
      var filteredHazards = computed(function () {
        var kw = listFilter.kw.trim();
        return state.hazards.filter(function (h) {
          if (kw && h.code.indexOf(kw) < 0 && h.name.indexOf(kw) < 0) return false;
          if (listFilter.township && h.township !== listFilter.township) return false;
          if (listFilter.status && h.status !== listFilter.status) return false;
          return true;
        });
      });
      var selected = computed(function () {
        return state.hazards.find(function (h) { return h.id === selectedId.value; }) || null;
      });
      function selectHazard(id) {
        selectedId.value = id;
        if (state.view === 'terrain' && scene && id) scene.selectHazard(id);
      }
      function openEditForm() {
        var h = selected.value;
        if (!h || state.role !== 'investigator') return;
        detailVisible.value = false;
        liveEval.value = { slope: h.slopeDeg, catchArea: h.catchArea, area: h.area, redFlag: h.redFlag, nearHouses: h.nearHouses, centroid: h.centroid };
        pendingPolygon.value = h.polygon;
        Object.assign(hform, {
          name: h.name, type: h.type, township: h.township, households: h.households,
          slopeHeight: h.slopeHeight, slopeDeg: h.slopeDeg, catchArea: h.catchArea,
          soilType: h.soilType, photos: h.photos.slice(), evacuationRoute: h.evacuationRoute,
          recheckConfirmed: h.recheckConfirmed
        });
        formEditingId.value = h.id;
        formVisible.value = true;
      }
      function confirmRedRecheck() {
        store.confirmRecheck(selectedId.value);
        showToast('已记录现场复核确认，可提交审核', 'success');
      }

      /* ---------- 审核动作 ---------- */
      var reviewTodo = computed(function () {
        return state.hazards.filter(function (h) { return ['待审核', '待复核'].indexOf(h.status) >= 0; });
      });
      var reviewDone = computed(function () {
        return state.hazards.filter(function (h) { return ['已确认', '已退回', '已销号', '待核查'].indexOf(h.status) >= 0; });
      });

      function openDetail(id) { selectedId.value = id; detailVisible.value = true; }
      function submitForReview() {
        var r = store.submitReview(selectedId.value);
        if (!r.ok) showToast(r.msg, 'error'); else showToast('已提交审核', 'success');
      }
      function openReturn() { returnReason.value = ''; returnVisible.value = true; }
      function confirmReturn() {
        if (!returnReason.value.trim()) { showToast('请填写退回意见', 'error'); return; }
        store.returnHazard(selectedId.value, returnReason.value);
        returnVisible.value = false;
        showToast('已退回调查员补充材料', 'info');
      }
      function approve() {
        store.approveHazard(selectedId.value, approveCycle.value);
        showToast('已确认并生成 ' + approveCycle.value + ' 天巡查任务，派至乡镇', 'success');
      }
      function resolveRecheck() {
        store.resolveRecheck(selectedId.value, '县地灾办现场复核：裂缝稳定，风险可控，维持原巡查周期');
        showToast('复核完成，恢复巡查任务', 'success');
      }
      function closeHazard() {
        store.closeHazard(selectedId.value, '工程治理/搬迁避让完成，连续监测无变形迹象');
        showToast('隐患点已核准销号', 'success');
      }
      function resubmitSupplements() {
        var h = selected.value;
        if (!h.photos.length) { showToast('请至少补充 1 张现场照片', 'error'); return; }
        if (!h.evacuationRoute) { showToast('请标注撤离路线后再提交', 'error'); return; }
        store.resubmit(h.id, { photos: h.photos, evacuationRoute: h.evacuationRoute });
        showToast('补充材料已重新提交审核', 'success');
      }

      /* ---------- 巡查 ---------- */
      var patrolList = computed(function () {
        return state.hazards.filter(function (h) { return ['已确认', '待复核'].indexOf(h.status) >= 0; });
      });
      function isOverdue(h) { return store.isOverdue(h); }
      function openCheckin(id) {
        checkinTargetId.value = id;
        Object.assign(checkinForm, { crackStatus: '', signStatus: '警示牌完好', newCrack: false, photos: [], note: '' });
        checkinVisible.value = true;
      }
      function openCheckinFromDetail() {
        detailVisible.value = false;
        openCheckin(selectedId.value);
      }
      var checkinTarget = computed(function () {
        return state.hazards.find(function (h) { return h.id === checkinTargetId.value; }) || null;
      });
      function submitCheckin() {
        if (!checkinForm.crackStatus.trim()) { showToast('请填写裂缝变化情况', 'error'); return; }
        if (checkinForm.newCrack && !checkinForm.photos.length) { showToast('新增裂缝必须附现场照片', 'error'); return; }
        store.checkIn(checkinTargetId.value, {
          crackStatus: checkinForm.crackStatus, signStatus: checkinForm.signStatus,
          newCrack: checkinForm.newCrack, photos: checkinForm.photos, note: checkinForm.note
        });
        checkinVisible.value = false;
        showToast(checkinForm.newCrack ? '打卡成功，新增裂缝已触发复核流程' : '巡查打卡成功', checkinForm.newCrack ? 'error' : 'success');
      }

      /* ---------- 看板 ---------- */
      var dash = computed(function () { return store.dashboard(); });
      function renderCharts() {
        if (state.view !== 'dashboard') return;
        charts.forEach(function (c) { c && c.dispose(); });
        charts = [];
        var d = store.dashboard();
        if (chartTown.value) {
          var c1 = echarts.init(chartTown.value);
          c1.setOption({
            title: { text: '分乡镇隐患点与威胁人数', left: 'center', textStyle: { fontSize: 15 } },
            tooltip: { trigger: 'axis' },
            legend: { bottom: 0, data: ['隐患点数', '威胁人数', '逾期巡查'] },
            grid: { left: 48, right: 48, top: 48, bottom: 48 },
            xAxis: { type: 'category', data: d.rows.map(function (r) { return r.township; }) },
            yAxis: [{ type: 'value', name: '点/人' }],
            series: [
              { name: '隐患点数', type: 'bar', data: d.rows.map(function (r) { return r.total; }), itemStyle: { color: '#2b6cb0' }, barMaxWidth: 34 },
              { name: '威胁人数', type: 'bar', data: d.rows.map(function (r) { return r.persons; }), itemStyle: { color: '#f08c2e' }, barMaxWidth: 34 },
              { name: '逾期巡查', type: 'bar', data: d.rows.map(function (r) { return r.overdue; }), itemStyle: { color: '#e5484d' }, barMaxWidth: 34 }
            ]
          });
          charts.push(c1);
        }
        if (chartRisk.value) {
          var riskCount = {};
          state.hazards.filter(function (h) { return h.status !== '已销号'; }).forEach(function (h) { riskCount[h.riskLevel] = (riskCount[h.riskLevel] || 0) + 1; });
          var c2 = echarts.init(chartRisk.value);
          c2.setOption({
            title: { text: '风险等级与状态分布', left: 'center', textStyle: { fontSize: 15 } },
            tooltip: { trigger: 'item' },
            legend: { bottom: 0 },
            series: [
              {
                name: '风险等级', type: 'pie', radius: ['32%', '58%'], center: ['50%', '46%'],
                data: Object.keys(G.RISK_META).map(function (k) { return { name: k, value: riskCount[k] || 0, itemStyle: { color: G.RISK_META[k].color } }; }),
                label: { formatter: '{b}\n{c} 点' }
              }
            ]
          });
          charts.push(c2);
        }
      }
      function resizeCharts() { charts.forEach(function (c) { c && c.resize(); }); }
      watch(function () { return state.view; }, function (v) { if (v === 'dashboard') nextTick(renderCharts); });
      watch(function () { return state.hazards.length; }, function () { if (state.view === 'dashboard') nextTick(renderCharts); });

      /* ---------- 台账/明白卡 ---------- */
      function exportCSV() {
        var csv = store.exportCSV();
        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = '群测群防台账_' + G.dayStr() + '.csv';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
        showToast('群测群防台账已导出（CSV，可用 Excel 打开）', 'success');
      }
      function openCard(id) { cardH.value = state.hazards.find(function (h) { return h.id === id; }); cardVisible.value = true; }
      function printCard() {
        try { window.print(); } catch (e) { showToast('当前环境不支持打印，请截图使用', 'info'); }
      }
      var today = G.dayStr();

      /* ---------- 工具 ---------- */
      function statusKey(s) {
        return { '待核查': 'daiche', '待审核': 'daishen', '已退回': 'tuihui', '待复核': 'daifuhe', '已确认': 'queren', '已销号': 'xiaohao' }[s] || 'daiche';
      }
      function showToast(msg, type) {
        toastState.msg = msg; toastState.type = type || 'info';
        clearTimeout(toastState.timer);
        toastState.timer = setTimeout(function () { toastState.msg = ''; }, 3200);
      }
      function resetDemo() {
        if (!confirm('确定清空当前本地数据并恢复演示数据？')) return;
        localStorage.removeItem('geo-hazard-system-v1');
        location.reload();
      }
      function onDataChanged() { /* store 已驱动响应式刷新，保留钩子 */ }

      return {
        // 基础
        views, view, switchView, role, badge, today,
        TOWNSHIPS: G.TOWNSHIPS, SOIL_TYPES: G.SOIL_TYPES, TYPES: G.TYPES,
        riskMeta: G.RISK_META, statusList, statusKey,
        hazards, filteredHazards, listFilter, selected, selectedId,
        selectHazard, openDetail, detailVisible, resetDemo,
        // 三维
        sceneEl, drawMode, houseMode, colorMode, layers, drawPts,
        setColorMode, toggleLayer, toggleDraw, toggleHouse, finishDraw,
        // 表单
        formVisible, hform, liveEval, formRisk, submitForm, cancelForm,
        onPhotoAdd, openEditForm,
        // 审核
        reviewTab, reviewTodo, reviewDone, submitForReview, confirmRedRecheck,
        openReturn, returnVisible, returnReason, confirmReturn,
        approve, approveCycle, resolveRecheck, closeHazard, resubmitSupplements,
        // 巡查
        patrolList, isOverdue, checkinVisible, checkinForm, checkinTarget,
        openCheckin, openCheckinFromDetail, submitCheckin, onCheckinPhotoAdd,
        // 看板
        dash, chartTown, chartRisk,
        // 台账
        exportCSV, cardVisible, cardH, cardEl, openCard, printCard,
        // 通用
        toast: toastState
      };
    }
  }).mount('#app');
})();
