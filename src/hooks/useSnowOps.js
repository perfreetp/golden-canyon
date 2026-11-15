import { useCallback, useMemo, useState } from 'react';
import { analyzeTrail, detectConflicts } from '../lib/trailMath.js';
import { SEED_TRAILS, SEED_GUNS, SEED_SNOW, SEED_INCIDENTS, SEED_LOG, ROLE, REVIEWER } from '../data/seed.js';

// A deterministic demo clock: the console reads as "this morning".
const stamp = () => {
  const d = new Date(2026, 10, 18, 9, 0, 0);
  const pad = (n) => String(n).padStart(2, '0');
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const uid = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

export function useSnowOps() {
  const [trails, setTrails] = useState(() => SEED_TRAILS.map((t) => ({ ...t })));
  const [guns, setGuns] = useState(() => SEED_GUNS.map((g) => ({ ...g })));
  const [snow] = useState(SEED_SNOW);
  const [incidents] = useState(SEED_INCIDENTS);
  const [log, setLog] = useState(SEED_LOG);
  const [selectedTrailId, setSelectedTrailId] = useState('T-02');
  const [selectedGunId, setSelectedGunId] = useState(null);
  const [clock, setClock] = useState(0);

  const pushLog = useCallback((entry) => {
    setLog((prev) => [
      {
        id: uid('L'),
        at: stamp(),
        actor: entry.actor || ROLE,
        ...entry,
      },
      ...prev,
    ]);
  }, []);

  // derived analyses -----------------------------------------------------
  const analyses = useMemo(() => {
    const out = {};
    for (const t of trails) {
      const tGuns = guns.filter((g) => g.trailId === t.id);
      out[t.id] = analyzeTrail(t, tGuns);
    }
    return out;
  }, [trails, guns]);

  const conflicts = useMemo(() => detectConflicts(trails, analyses), [trails, analyses]);

  const conflictsByTrail = useMemo(() => {
    const map = {};
    for (const c of conflicts) {
      if (c.kind === 'queue') {
        for (const id of c.trails) (map[id] ||= []).push(c);
      } else {
        for (const id of c.trails) (map[id] ||= []).push(c);
      }
    }
    return map;
  }, [conflicts]);

  // mutation helpers -----------------------------------------------------
  const updateTrail = useCallback((id, patch, logEntry) => {
    setTrails((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    if (logEntry) {
      const t = trails.find((x) => x.id === id);
      pushLog({ trailId: id, trailName: t?.name, ...logEntry });
    }
  }, [trails, pushLog]);

  const setCenterline = useCallback((id, centerline) => {
    setTrails((prev) => prev.map((t) => (t.id === id ? { ...t, centerline } : t)));
  }, []);

  const createTrail = useCallback((payload) => {
    const id = `T-${String(8 + Math.floor(Math.random() * 90)).padStart(2, '0')}`;
    const next = {
      id,
      status: 'draft',
      notes: '',
      review: null,
      baseStation: 'A',
      season: { start: '12-01', end: '03-31' },
      dailyCapacity: 2000,
      ...payload,
    };
    setTrails((prev) => [next, ...prev]);
    setSelectedTrailId(id);
    pushLog({
      kind: 'design',
      trailId: id,
      trailName: next.name,
      summary: `新建雪道线位（${payload.centerline.length} 个控制点）`,
    });
    return next;
  }, [pushLog]);

  const deleteTrail = useCallback((id) => {
    const t = trails.find((x) => x.id === id);
    setTrails((prev) => prev.filter((x) => x.id !== id));
    setGuns((prev) => prev.filter((g) => g.trailId !== id));
    pushLog({ kind: 'design', trailId: id, trailName: t?.name, summary: '删除雪道方案' });
    setSelectedTrailId((cur) => (cur === id ? null : cur));
  }, [trails, pushLog]);

  const addGun = useCallback((trailId, type, x, z) => {
    const id = uid('G');
    const gun = { id, trailId, type, x, z };
    setGuns((prev) => [...prev, gun]);
    const t = trails.find((tt) => tt.id === trailId);
    pushLog({
      kind: 'gun',
      trailId,
      trailName: t?.name,
      actor: '造雪组 · 赵岩',
      summary: `布设${type === 'fan' ? '造雪炮' : '水枪'} ${id}，坐标 (${Math.round(x)}, ${Math.round(z)})`,
    });
    return gun;
  }, [trails, pushLog]);

  const removeGun = useCallback((gunId) => {
    setGuns((prev) => prev.filter((g) => g.id !== gunId));
    setSelectedGunId((cur) => (cur === gunId ? null : cur));
    pushLog({ kind: 'gun', summary: `撤除造雪设备 ${gunId}` });
  }, [pushLog]);

  const moveGun = useCallback((gunId, x, z) => {
    setGuns((prev) => prev.map((g) => (g.id === gunId ? { ...g, x, z } : g)));
  }, []);

  const submitForReview = useCallback((id) => {
    const t = trails.find((x) => x.id === id);
    if (!t) return;
    updateTrail(id, { status: 'review', review: null }, {
      kind: 'design',
      summary: '提交审核',
    });
    setClock((c) => c + 1);
  }, [trails, updateTrail]);

  const approve = useCallback((id) => {
    const t = trails.find((x) => x.id === id);
    if (!t) return;
    updateTrail(id, { status: 'open', review: { by: REVIEWER, action: 'approve', at: stamp(), comment: '' } }, {
      kind: 'review', actor: REVIEWER,
      summary: '审核通过，转为已开放',
    });
    setClock((c) => c + 1);
  }, [trails, updateTrail]);

  const reject = useCallback((id, comment) => {
    const t = trails.find((x) => x.id === id);
    if (!t) return;
    updateTrail(id, {
      status: 'draft',
      review: { by: REVIEWER, action: 'reject', at: stamp(), comment },
    }, {
      kind: 'review', actor: REVIEWER,
      summary: `退回整改：${comment.slice(0, 40)}${comment.length > 40 ? '…' : ''}`,
    });
    setClock((c) => c + 1);
  }, [trails, updateTrail]);

  const closeTrail = useCallback((id, reason) => {
    updateTrail(id, { status: 'closed' }, { kind: 'status', summary: `封闭：${reason || '运营调整'}` });
  }, [updateTrail]);

  const reopenTrail = useCallback((id) => {
    updateTrail(id, { status: 'open' }, { kind: 'status', summary: '解除封闭，恢复开放' });
  }, [updateTrail]);

  const saveGunPlan = useCallback((id) => {
    const t = trails.find((x) => x.id === id);
    const plan = analyses[id];
    const deficit = plan ? Math.max(0, 100 - plan.coveredPct) : 0;
    pushLog({
      kind: 'gun',
      trailId: id,
      trailName: t?.name,
      summary: `提交造雪布点方案：设备 ${guns.filter((g) => g.trailId === id).length} 台，覆盖率 ${plan ? plan.coveredPct.toFixed(0) : 0}%${deficit > 1 ? `，仍有 ${deficit.toFixed(0)}% 未覆盖` : ''}`,
    });
    setClock((c) => c + 1);
  }, [trails, analyses, guns, pushLog]);

  return {
    trails,
    guns,
    snow,
    incidents,
    log,
    analyses,
    conflicts,
    conflictsByTrail,
    selectedTrailId,
    setSelectedTrailId,
    selectedGunId,
    setSelectedGunId,
    clock,
    updateTrail,
    setCenterline,
    createTrail,
    deleteTrail,
    addGun,
    removeGun,
    moveGun,
    submitForReview,
    approve,
    reject,
    closeTrail,
    reopenTrail,
    saveGunPlan,
  };
}
