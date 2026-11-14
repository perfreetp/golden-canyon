import { RULE_META, SEVERITY_META } from './spec';
import type { Batch, Issue, ReleaseLog } from '../types';
import { fmtDate } from './geometry';

function download(name: string, content: string) {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportRectification(batch: Batch, issues: Issue[]) {
  const head = ['问题编号', '严重级别', '检查项', '问题描述', '判定依据', '状态', '复核依据'];
  const rows = issues.map((i) => [
    i.id,
    SEVERITY_META[i.severity].label,
    RULE_META[i.rule].name,
    i.detail,
    i.basis,
    { open: '待复核', confirmed: '已确认', rejected: '已驳回', fixed: '已整改' }[i.status],
    i.reviewNote ?? ''
  ]);
  const csv = [head, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  download(`${batch.id}_整改清单.csv`, csv);
}

export function exportReleaseLog(log: ReleaseLog) {
  const rows = [
    ['批次编号', log.batchId],
    ['批次名称', log.batchName],
    ['楼栋', log.building],
    ['楼层', log.floors.join(',')],
    ['检查轮次', `第 ${log.round} 轮`],
    ['处置动作', log.action === 'released' ? '整批放行' : '整批退回'],
    ['处置时间', fmtDate(log.at)],
    ['操作人', log.operator],
    [
      '问题分布',
      `严重 ${log.issueSummary.severe} / 一般 ${log.issueSummary.major} / 提示 ${log.issueSummary.minor}`
    ],
    ['说明', log.note ?? '']
  ];
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  download(`${log.batchId}_发行留档.csv`, csv);
}
