<script setup lang="ts">
import { computed } from 'vue'
import type { Drawing, DrawingEntity } from '@/types'
import { computeBBox } from '@/render/geometry'

const props = defineProps<{ drawing: Drawing; entity: DrawingEntity | null }>()
const emit = defineEmits<{ (e: 'change'): void; (e: 'close'): void }>()

const kindLabel: Record<string, string> = {
  'room-outline': '房间轮廓',
  'wash-sink': '清洗槽',
  'disinfect-tank': '消毒槽',
  'dry-bench': '干燥台',
  'scope-cabinet': '储镜柜',
  'dirt-zone': '污物通道/区',
  'flow-line': '洁/污流线',
  wall: '墙体',
  door: '门',
  label: '标注',
}

const dueInfo = computed(() => {
  const d = props.entity?.device
  if (!d) return null
  const next = new Date(d.lastMaintenanceDate)
  next.setDate(next.getDate() + d.maintenanceCycleDays)
  const days = Math.ceil((next.getTime() - Date.now()) / 86400_000)
  return { next: next.toISOString().slice(0, 10), days }
})

function touch() {
  if (!props.entity) return
  props.entity.updatedAt = Date.now()
  props.entity.bbox = computeBBox(props.entity)
  emit('change')
}

function maintenanceDueColor(days: number) {
  if (days < 0) return 'danger'
  if (days <= 30) return 'warn'
  return 'ok'
}
</script>

<template>
  <div v-if="!entity" class="empty muted">
    <p>未选中图元</p>
    <p>在「选择」模式下点击画布中的设备、流线或标注查看所属设备与最近检修日期。</p>
  </div>
  <div v-else class="prop">
    <div class="title-row">
      <b>{{ kindLabel[entity.kind] }}</b>
      <button @click="emit('close')">×</button>
    </div>
    <code class="eid">{{ entity.id }}</code>

    <template v-if="entity.geom">
      <div class="grp">几何参数 (mm)</div>
      <div class="grid2">
        <label>中心 X<input type="number" v-model.number="entity.geom.cx" @change="touch" /></label>
        <label>中心 Y<input type="number" v-model.number="entity.geom.cy" @change="touch" /></label>
        <label>宽 W<input type="number" v-model.number="entity.geom.w" @change="touch" /></label>
        <label>高 H<input type="number" v-model.number="entity.geom.h" @change="touch" /></label>
      </div>
      <label class="full">旋转角 (°)
        <input type="number" :value="Math.round((entity.geom.rotation * 180) / Math.PI)" disabled />
      </label>
    </template>

    <template v-if="entity.label">
      <div class="grp">标注</div>
      <label class="full">文字<input v-model="entity.label.text" @change="touch" /></label>
      <label class="full">字高 (mm)<input type="number" v-model.number="entity.label.heightMm" @change="touch" /></label>
    </template>

    <template v-if="entity.flow">
      <div class="grp">流线（{{ entity.flow.flowType === 'clean' ? '清洁（绿）' : '污物（红）' }}）</div>
      <p class="muted small">节点数 {{ entity.flow.points.length }}，可在画布上用 Delete 删除后重画。</p>
      <div v-if="entity.flow.crossings?.length" class="cross-warn">
        ⚠ 与异类流线存在 {{ entity.flow.crossings.length }} 处交叉，画布已自动标红
      </div>
    </template>

    <template v-if="entity.device">
      <div class="grp">所属设备台账</div>
      <label class="full">设备名称<input v-model="entity.device.name" @change="touch" /></label>
      <label class="full">资产编号<input v-model="entity.device.assetNo" @change="touch" /></label>
      <div class="grid2">
        <label>型号规格<input v-model="entity.device.model" @change="touch" /></label>
        <label>生产厂商<input v-model="entity.device.manufacturer" @change="touch" /></label>
      </div>
      <label class="full">最近检修日期
        <input type="date" v-model="entity.device.lastMaintenanceDate" @change="touch" />
      </label>
      <label class="full">检修周期（天）
        <input type="number" v-model.number="entity.device.maintenanceCycleDays" @change="touch" />
      </label>
      <div v-if="dueInfo" class="due">
        <span>下次检修 {{ dueInfo.next }}</span>
        <span class="tag" :class="maintenanceDueColor(dueInfo.days)">
          {{ dueInfo.days < 0 ? `已超期 ${-dueInfo.days} 天` : `剩余 ${dueInfo.days} 天` }}
        </span>
      </div>
      <label class="full">备注<input v-model="entity.device.remark" @change="touch" /></label>
    </template>

    <div class="grp">状态</div>
    <label class="check"><input type="checkbox" v-model="entity.locked" @change="touch" /> 锁定图元（防误删/防移动）</label>
  </div>
</template>

<style scoped>
.empty {
  padding: 20px 14px;
  font-size: 12.5px;
  line-height: 1.8;
}
.prop {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.title-row button {
  border: none;
  font-size: 16px;
}
.eid {
  font-size: 11px;
  color: var(--c-text-2);
}
.grp {
  font-size: 12px;
  font-weight: 700;
  color: var(--c-primary);
  border-bottom: 1px solid #e6ebf1;
  padding-bottom: 3px;
  margin-top: 6px;
}
.grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
label {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 12px;
  color: var(--c-text-2);
}
label.full {
  display: flex;
  flex-direction: column;
}
input {
  padding: 4px 7px;
}
.check {
  flex-direction: row;
  align-items: center;
  gap: 6px;
}
.due {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #f6f8fb;
  border-radius: 5px;
  padding: 7px 9px;
  font-size: 12.5px;
}
.cross-warn {
  background: #fbe5e2;
  color: var(--c-danger);
  border-radius: 5px;
  padding: 8px 10px;
  font-size: 12.5px;
  line-height: 1.6;
}
.small {
  font-size: 12px;
  margin: 2px 0;
}
</style>
