<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  batchAddRoutes, canEdit, conflictReport, currentStation, downloadCsv, fixRoute,
  removeRoute, state, updateRoute
} from '../store'
import type { Direction, Route, RouteType, SwitchPosition } from '../types'
import { dirLabel, posLabel, routeTypeLabel, uid } from '../lib/util'

const station = computed(() => currentStation.value!)
const editable = computed(() => state.role === 'designer' && canEdit.value)

const genForm = ref<{ direction: Direction; types: RouteType[] }>({
  direction: 'right',
  types: ['arrival', 'departure', 'shunt']
})
const genMsg = ref('')

function toggleType(t: RouteType) {
  const arr = genForm.value.types
  const i = arr.indexOf(t)
  if (i >= 0) arr.splice(i, 1)
  else arr.push(t)
}

function doGenerate() {
  if (!genForm.value.types.length) {
    genMsg.value = '请至少选择一种进路类型'
    return
  }
  const created = batchAddRoutes(station.value, genForm.value.direction, genForm.value.types)
  genMsg.value = created.length
    ? `已生成 ${created.length} 条${dirLabel(genForm.value.direction)}进路：${created.map((r) => r.name).join('、')}`
    : '未生成新进路：对应信号机组合均已存在或拓扑不可达'
}

const report = computed(() => conflictReport(station.value))

function isHostile(id: string) {
  return report.value.hostileRouteIds.has(id)
}
function isSwitchConflict(id: string) {
  return report.value.switchConflictRouteIds.has(id)
}

const nameOf = {
  switch: (id: string) => station.value.switches.find((s) => s.id === id)?.name ?? id,
  section: (id: string) => station.value.sections.find((s) => s.id === id)?.name ?? id,
  signal: (id: string) => station.value.signals.find((s) => s.id === id)?.name ?? id
}

// ---------- 手工新增/编辑 ----------
const editing = ref<Route | null>(null)
const isNew = ref(false)

function blankRoute(): Route {
  return {
    id: uid('route'),
    name: '新调车进路',
    type: 'shunt',
    direction: 'right',
    startSignalId: '',
    endSignalId: '',
    pathNodeKeys: [],
    switchReqs: [],
    sectionOrder: [],
    protectiveSwitches: [],
    simStatus: 'unrun'
  }
}

function openNew() {
  editing.value = blankRoute()
  isNew.value = true
}
function openEdit(r: Route) {
  editing.value = JSON.parse(JSON.stringify(r)) as Route
  isNew.value = false
}

function saveEdit() {
  const r = editing.value!
  if (!r.startSignalId || !r.endSignalId) {
    alert('请选择始端按钮与终端按钮（信号机）')
    return
  }
  if (r.startSignalId === r.endSignalId) {
    alert('始端与终端不能为同一信号机')
    return
  }
  if (isNew.value) {
    station.value.routes.push({ ...r })
  } else {
    const target = station.value.routes.find((x) => x.id === r.id)!
    Object.assign(target, r)
  }
  editing.value = null
}

// 编辑表格内的道岔要求
function addSwitchReq() {
  const sw = station.value.switches[0]
  if (sw) editing.value?.switchReqs.push({ switchId: sw.id, position: 'normal' as SwitchPosition })
}
function addProtective() {
  const sw = station.value.switches[0]
  if (sw && editing.value && !editing.value.protectiveSwitches.includes(sw.id)) {
    editing.value.protectiveSwitches.push(sw.id)
  }
}

// 展开行
const expanded = ref<string | null>(null)
function toggleExpand(id: string) {
  expanded.value = expanded.value === id ? null : id
}

function recompute(r: Route) {
  if (fixRoute(station.value, r.id)) alert('已按当前站场拓扑重新计算道岔要求与区段顺序')
  else alert('重算失败：始端/终端信号机在当前拓扑下不可达，请检查站场设备')
}

function del(r: Route) {
  if (confirm(`确认删除进路「${r.name}」？`)) removeRoute(station.value, r.id)
}

const simTag = computed(() => ({
  unrun: ['gray', '未仿真'], passed: ['green', '仿真通过'], failed: ['red', '仿真未通过']
}))
</script>

<template>
  <div v-if="station">
    <h2 class="page-title">
      进路表编制 —— {{ station.name }}
      <span v-if="!editable" class="tag orange">只读（提交/发布后锁定，退回后方可修改）</span>
    </h2>

    <!-- 批量生成 -->
    <div class="panel gen-bar">
      <div class="gen-row">
        <span class="lbl">运行方向：</span>
        <label><input type="radio" value="right" v-model="genForm.direction" :disabled="!editable" /> 向右（上行）</label>
        <label><input type="radio" value="left" v-model="genForm.direction" :disabled="!editable" /> 向左（下行）</label>
      </div>
      <div class="gen-row">
        <span class="lbl">进路类型：</span>
        <label><input type="checkbox" :checked="genForm.types.includes('arrival')" @change="toggleType('arrival')" :disabled="!editable" /> 接车进路</label>
        <label><input type="checkbox" :checked="genForm.types.includes('departure')" @change="toggleType('departure')" :disabled="!editable" /> 发车进路</label>
        <label><input type="checkbox" :checked="genForm.types.includes('shunt')" @change="toggleType('shunt')" :disabled="!editable" /> 调车进路</label>
      </div>
      <div class="gen-row">
        <button class="primary" :disabled="!editable" @click="doGenerate">按方向批量生成进路</button>
        <button :disabled="!editable" @click="openNew">手工新增进路</button>
        <button class="ghost" @click="downloadCsv(station)">导出单站进路清单（CSV）</button>
      </div>
      <div v-if="genMsg" class="gen-msg muted">{{ genMsg }}</div>
    </div>

    <!-- 冲突汇总条 -->
    <div class="conflict-bar">
      <span :class="['tag', report.hostile.length ? 'red' : 'green']">
        敌对进路冲突 {{ report.hostile.length }} 对
      </span>
      <span :class="['tag', report.switchConflicts.length ? 'orange' : 'green']">
        防护道岔位置冲突 {{ report.switchConflicts.length }} 对
      </span>
      <span class="muted">规则：同一区段、同方向被两条进路占用即判定敌对（红色行）；防护道岔/道岔定反位要求相反单独列出（橙色行）。</span>
    </div>

    <!-- 敌对明细 -->
    <div v-if="report.hostile.length" class="panel conflict-panel">
      <h3 class="danger-text">⚠ 敌对进路明细（{{ report.hostile.length }}）</h3>
      <div v-for="(c, i) in report.hostile" :key="'h' + i" class="conflict-item">
        <b>{{ station.routes.find(r => r.id === c.routeA)?.name }}</b>
        与
        <b>{{ station.routes.find(r => r.id === c.routeB)?.name }}</b>
        在区段 <b class="danger-text">{{ nameOf.section(c.sectionId) }}</b>
        同方向（{{ dirLabel(c.direction) }}）重复占用 → 敌对进路，禁止同时排列
      </div>
    </div>

    <!-- 防护道岔冲突明细 -->
    <div v-if="report.switchConflicts.length" class="panel conflict-panel warn-panel">
      <h3 class="warn-text">⚙ 防护道岔位置冲突明细（{{ report.switchConflicts.length }}）</h3>
      <div v-for="(c, i) in report.switchConflicts" :key="'s' + i" class="conflict-item">
        <b>{{ station.routes.find(r => r.id === c.routeA)?.name }}</b>
        与
        <b>{{ station.routes.find(r => r.id === c.routeB)?.name }}</b>
        对道岔 <b class="warn-text">{{ nameOf.switch(c.switchId) }}</b>
        位置要求冲突：{{ posLabel(c.posA) }} vs {{ posLabel(c.posB) }}
      </div>
    </div>

    <!-- 进路表 -->
    <div class="panel table-panel scroll">
      <table>
        <thead>
          <tr>
            <th style="width: 40px">#</th>
            <th>进路名称</th>
            <th>类型/方向</th>
            <th>始端按钮</th>
            <th>终端按钮</th>
            <th>道岔定反位</th>
            <th>防护道岔</th>
            <th>区段占用顺序</th>
            <th>仿真</th>
            <th style="width: 150px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in station.routes" :key="r.id"
              :class="isHostile(r.id) ? 'row-danger' : isSwitchConflict(r.id) ? 'row-warn' : ''">
            <td>{{ i + 1 }}</td>
            <td>
              <a class="link" @click="toggleExpand(r.id)">{{ r.name }}</a>
              <span v-if="isHostile(r.id)" class="tag red" style="margin-left:6px">敌对</span>
              <span v-else-if="isSwitchConflict(r.id)" class="tag orange">道岔冲突</span>
            </td>
            <td>{{ routeTypeLabel(r.type) }} / {{ r.direction === 'left' ? '←下行' : '→上行' }}</td>
            <td>{{ nameOf.signal(r.startSignalId) }}</td>
            <td>{{ nameOf.signal(r.endSignalId) }}</td>
            <td>
              <span v-for="x in r.switchReqs" :key="x.switchId" class="chip">
                {{ nameOf.switch(x.switchId) }}:{{ posLabel(x.position) }}
              </span>
              <span v-if="!r.switchReqs.length" class="muted">—</span>
            </td>
            <td>
              <span v-for="id in r.protectiveSwitches" :key="id" class="chip gray-chip">
                {{ nameOf.switch(id) }}:定位
              </span>
              <span v-if="!r.protectiveSwitches.length" class="muted">—</span>
            </td>
            <td class="sec-order">{{ r.sectionOrder.map(nameOf.section).join(' → ') || '—' }}</td>
            <td>
              <span :class="['tag', simTag[r.simStatus ?? 'unrun'][0]]">{{ simTag[r.simStatus ?? 'unrun'][1] }}</span>
            </td>
            <td>
              <button class="sm" :disabled="!editable" @click="openEdit(r)">编辑</button>
              <button class="sm danger" :disabled="!editable" @click="del(r)">删除</button>
            </td>
          </tr>
          <tr v-if="!station.routes.length">
            <td colspan="10" class="empty">暂无进路。设置方向与类型后点击「按方向批量生成进路」，或手工新增。</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 展开详情 -->
    <div v-if="expanded" class="modal-mask" @click.self="expanded = null">
      <div class="modal">
        <h3>进路详情</h3>
        <template v-for="r in station.routes.filter(x => x.id === expanded)" :key="r.id">
          <div class="detail-grid">
            <div><span class="muted">进路：</span><b>{{ r.name }}</b></div>
            <div><span class="muted">类型：</span>{{ routeTypeLabel(r.type) }}，{{ dirLabel(r.direction) }}</div>
            <div><span class="muted">始端按钮：</span>{{ nameOf.signal(r.startSignalId) }}　<span class="muted">终端按钮：</span>{{ nameOf.signal(r.endSignalId) }}</div>
            <div><span class="muted">道岔要求：</span>
              <span v-for="x in r.switchReqs" :key="x.switchId" class="chip">{{ nameOf.switch(x.switchId) }}:{{ posLabel(x.position) }}</span>
            </div>
            <div><span class="muted">防护道岔：</span>{{ r.protectiveSwitches.map(nameOf.switch).join('、') || '—' }}</div>
            <div><span class="muted">区段占用顺序：</span>{{ r.sectionOrder.map(nameOf.section).join(' → ') || '—' }}</div>
            <div v-if="r.simStatus === 'failed'"><span class="muted">仿真失败：</span><b class="danger-text">第 {{ (r.simFailStep ?? 0) + 1 }} 步 — {{ r.simFailReason }}</b></div>
            <div v-if="r.note"><span class="muted">备注：</span>{{ r.note }}</div>
          </div>
          <div class="actions">
            <button :disabled="!editable" @click="recompute(r)">按当前拓扑重算</button>
            <button class="primary" @click="expanded = null">关闭</button>
          </div>
        </template>
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <div v-if="editing" class="modal-mask" @click.self="editing = null">
      <div class="modal wide">
        <h3>{{ isNew ? '手工新增进路' : '编辑进路' }}</h3>
        <div class="form-grid">
          <label>进路名称<input v-model="editing.name" :disabled="!editable" /></label>
          <label>类型
            <select v-model="editing.type" :disabled="!editable">
              <option value="arrival">接车进路</option>
              <option value="departure">发车进路</option>
              <option value="shunt">调车进路</option>
            </select>
          </label>
          <label>运行方向
            <select v-model="editing.direction" :disabled="!editable">
              <option value="right">向右（上行）</option>
              <option value="left">向左（下行）</option>
            </select>
          </label>
          <label>始端按钮（信号机）
            <select v-model="editing.startSignalId" :disabled="!editable">
              <option value="" disabled>请选择</option>
              <option v-for="s in station.signals" :key="s.id" :value="s.id">{{ s.name }}（{{ { entry: '进站', exit: '出站', shunt: '调车' }[s.kind] }}）</option>
            </select>
          </label>
          <label>终端按钮（信号机）
            <select v-model="editing.endSignalId" :disabled="!editable">
              <option value="" disabled>请选择</option>
              <option v-for="s in station.signals" :key="s.id" :value="s.id">{{ s.name }}（{{ { entry: '进站', exit: '出站', shunt: '调车' }[s.kind] }}）</option>
            </select>
          </label>
        </div>

        <h4>道岔定/反位要求</h4>
        <table class="mini-table">
          <thead><tr><th>道岔</th><th>位置</th><th></th></tr></thead>
          <tbody>
            <tr v-for="(req, i) in editing.switchReqs" :key="i">
              <td>
                <select v-model="req.switchId" :disabled="!editable">
                  <option v-for="s in station.switches" :key="s.id" :value="s.id">{{ s.name }}</option>
                </select>
              </td>
              <td>
                <select v-model="req.position" :disabled="!editable">
                  <option value="normal">定位</option>
                  <option value="reverse">反位</option>
                </select>
              </td>
              <td><button class="sm danger" :disabled="!editable" @click="editing.switchReqs.splice(i, 1)">移除</button></td>
            </tr>
          </tbody>
        </table>
        <button class="sm" :disabled="!editable || !station.switches.length" @click="addSwitchReq">添加道岔要求</button>

        <h4>防护道岔（要求定位）</h4>
        <div class="chip-line">
          <span v-for="id in editing.protectiveSwitches" :key="id" class="chip gray-chip">
            {{ nameOf.switch(id) }}
            <button v-if="editable" class="chip-x" @click="editing.protectiveSwitches.splice(editing.protectiveSwitches.indexOf(id), 1)">×</button>
          </span>
          <span v-if="!editing.protectiveSwitches.length" class="muted">无</span>
        </div>
        <button class="sm" :disabled="!editable || !station.switches.length" @click="addProtective">添加防护道岔</button>

        <h4>区段占用顺序（按列车走行先后）</h4>
        <div class="sec-edit">
          <template v-for="(id, i) in editing.sectionOrder" :key="id">
            <select v-model="editing.sectionOrder[i]" :disabled="!editable">
              <option v-for="s in station.sections" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
            <span v-if="i < editing.sectionOrder.length - 1" class="arrow">→</span>
          </template>
          <button class="sm" :disabled="!editable || !station.sections.length"
                  @click="editing.sectionOrder.push(station.sections[0].id)">追加区段</button>
          <button v-if="editing.sectionOrder.length" class="sm" :disabled="!editable"
                  @click="editing.sectionOrder.pop()">移除末段</button>
        </div>

        <label class="note-lbl">备注<input v-model="editing.note" :disabled="!editable" placeholder="选填" /></label>

        <div class="actions">
          <button @click="editing = null">取消</button>
          <button class="primary" :disabled="!editable" @click="saveEdit">保存进路</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gen-bar { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
.gen-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.gen-row label { display: flex; align-items: center; gap: 5px; }
.lbl { font-weight: 700; color: #33475c; }
.gen-msg { font-size: 12px; }
.conflict-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
.conflict-panel { margin-bottom: 12px; }
.warn-panel { border-left: 4px solid var(--warn); }
.conflict-panel h3 { margin: 0 0 8px; font-size: 14px; }
.conflict-item { padding: 5px 0; font-size: 13px; border-bottom: 1px dashed var(--line); }
.conflict-item:last-child { border-bottom: none; }
.table-panel { padding: 0; max-height: 52vh; }
.table-panel table { font-size: 13px; }
.chip {
  display: inline-block;
  background: #e6effd;
  color: var(--primary);
  border-radius: 6px;
  padding: 2px 7px;
  margin: 2px 3px 2px 0;
  font-size: 12px;
  white-space: nowrap;
}
.gray-chip { background: #f1eafd; color: var(--accent); }
.sec-order { max-width: 260px; font-size: 12px; line-height: 1.6; }
.link { color: var(--primary); cursor: pointer; font-weight: 600; }
.modal.wide { width: min(820px, 94vw); }
h4 { margin: 16px 0 8px; }
.mini-table { width: auto; min-width: 320px; margin-bottom: 8px; }
.chip-line { margin-bottom: 8px; }
.chip-x { border: none; background: transparent; color: var(--accent); padding: 0 2px; }
.sec-edit { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
.arrow { color: var(--muted); }
.note-lbl { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--muted); margin-top: 14px; }
.detail-grid { display: grid; grid-template-columns: 1fr; gap: 10px; }
</style>
