<template>
  <div>
    <!-- 新建批次（仅教研员） -->
    <div v-if="can('create')" class="panel">
      <h3>新建素材批次 <small>教研员录入切面参数规范</small></h3>
      <div class="form-grid">
        <label class="field">供应方
          <select v-model="form.supplier">
            <option v-for="s in SUPPLIERS" :key="s" :value="s">{{ s }}</option>
          </select>
        </label>
        <label class="field">切面类型
          <select v-model="form.viewType">
            <option v-for="(v, k) in VIEW_TYPES" :key="k" :value="k">{{ v.name }}</option>
          </select>
        </label>
        <label class="field">探头角度（°）
          <input type="number" v-model="form.probeAngle" min="-30" max="30" />
        </label>
        <label class="field">腔室标注层级
          <select v-model="form.level">
            <option v-for="(l, k) in LEVELS" :key="k" :value="k">{{ l.name }}</option>
          </select>
        </label>
        <label class="field">线宽（px）
          <input type="number" v-model="form.lineWidth" min="1" max="6" step="0.5" />
        </label>
        <label class="field">配色规范
          <select v-model="form.palette">
            <option v-for="(p, k) in PALETTES" :key="k" :value="k">{{ p.name }}</option>
          </select>
        </label>
        <label class="field">随机种子
          <input v-model="form.seed" class="mono" placeholder="如 SEED-1001" />
        </label>
        <label class="field">每批切面数量
          <input type="number" v-model="form.count" min="1" max="12" />
        </label>
      </div>
      <div class="row mt">
        <button class="btn" @click="create">创建批次</button>
        <span class="muted" style="font-size:12px">同一组参数 + 同一种子生成的图完全一致，可复现、可比对。</span>
      </div>
    </div>

    <!-- 批次列表 -->
    <div class="panel">
      <h3>批次列表 <small>{{ store.role === 'supplier' ? `仅显示「${store.supplierName}」的批次` : '全部批次' }}</small></h3>
      <table class="data" v-if="batches.length">
        <thead>
          <tr>
            <th>批次号</th><th>供应方</th><th>切面类型</th><th>参数</th><th>种子</th>
            <th>状态</th><th>提交时间</th><th>复核人</th><th>结论</th><th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="b in batches" :key="b.id">
            <td class="mono">{{ b.id }}</td>
            <td>{{ b.supplier }}</td>
            <td>{{ VIEW_TYPES[b.viewType].name }}</td>
            <td>
              <span class="tag">{{ LEVELS[b.level].name }}</span>
              <span class="tag">{{ b.probeAngle }}°</span>
              <span class="tag">线宽{{ b.lineWidth }}</span>
              <span class="tag">{{ PALETTES[b.palette].name }}</span>
            </td>
            <td class="mono">{{ b.seed }}</td>
            <td><span class="chip" :style="{ background: BATCH_STATUS[b.status].color }">{{ BATCH_STATUS[b.status].name }}</span></td>
            <td class="muted">{{ b.submittedAt || '—' }}</td>
            <td>{{ b.reviewer || '—' }}</td>
            <td>{{ b.verdict || '—' }}</td>
            <td>
              <div class="row" style="gap:4px">
                <button v-if="can('generate')" class="btn sm ghost" @click="$emit('goto', 'gen', b.id)">生成</button>
                <button v-if="b.status !== 'draft'" class="btn sm ghost" @click="$emit('goto', 'qc', b.id)">质检</button>
                <button v-if="can('delete') && b.status === 'draft'" class="btn sm bad" @click="del(b)">删除</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">暂无批次</div>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed } from 'vue'
import {
  store, can, createBatch, deleteBatch,
  SUPPLIERS, BATCH_STATUS, visibleBatches
} from '../store'
import { VIEW_TYPES, LEVELS, PALETTES } from '../generator'

defineEmits(['goto'])

const form = reactive({
  supplier: SUPPLIERS[0], viewType: 'A4C', probeAngle: 0,
  level: 'L2', lineWidth: 2, palette: 'standard',
  seed: `SEED-${Math.floor(1000 + Math.random() * 9000)}`, count: 3
})

const batches = computed(() => visibleBatches())

function create() {
  createBatch({ ...form })
}
function del(b) {
  if (confirm(`确认删除批次 ${b.id}？`)) deleteBatch(b)
}
</script>
