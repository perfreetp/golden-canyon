import type { Patient, RoleProfile } from '../types';

export const ROLES: RoleProfile[] = [
  {
    id: 'therapist',
    label: '治疗师',
    person: '林知夏',
    title: '儿童作业治疗师 · 展项提交人',
    color: '#0f766e',
    desc: '布置展项、配置训练内容并提交审核，可查看自己负责患者的训练记录。',
  },
  {
    id: 'reviewer',
    label: '审核人',
    person: '周明远',
    title: '康复技术主管 · 内容审核',
    color: '#7c3aed',
    desc: '审查提交的展项内容与安全参数，通过后展项才对患者开放，退回须填写原因。',
  },
  {
    id: 'supervisor',
    label: '主管',
    person: '陈澜',
    title: '康复中心运营主管',
    color: '#b45309',
    desc: '查看全部展项、训练记录与运营看板，可导出布置图与物料清单，不参与具体审核。',
  },
  {
    id: 'patient',
    label: '患者端',
    person: '大厅互动大屏',
    title: '儿童训练终端（大屏）',
    color: '#0891b2',
    desc: '在展项大屏上轮播可用训练，登录后按设定时长完成训练并生成训练小结。',
  },
];

export const PATIENTS: Patient[] = [
  { id: 'p1', name: '小宇', age: 7, sex: '男', goal: '视觉追踪与手眼协调', color: '#0891b2' },
  { id: 'p2', name: '苗苗', age: 6, sex: '女', goal: '站立平衡与核心稳定', color: '#b45309' },
  { id: 'p3', name: '乐乐', age: 9, sex: '男', goal: '抓握力量与双侧协调', color: '#be123c' },
  { id: 'p4', name: '果果', age: 5, sex: '女', goal: '视觉追踪与注意力', color: '#7c3aed' },
  { id: 'p5', name: '阿泽', age: 11, sex: '男', goal: '认知配对与记忆', color: '#0f766e' },
  { id: 'p6', name: '小满', age: 8, sex: '女', goal: '全身协调与动作模仿', color: '#4338ca' },
];

export const PATIENT_BY_ID: Record<string, Patient> = Object.fromEntries(
  PATIENTS.map((p) => [p.id, p]),
);

export const DEMO_NAMES = ['小宇', '苗苗', '乐乐', '果果', '阿泽', '小满'];

export function uid(prefix = 'id'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Math.random().toString(36).slice(2, 5)}`;
}

export function todayISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
