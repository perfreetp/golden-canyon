// 全局状态：三套方案、视图、校核流程（草稿 → 待复核 → 已审定）
import { createStore, produce } from 'solid-js/store';
import { createSignal, createEffect } from 'solid-js';

const LS_KEY = 'tl-route-design-v1';

function mkTowers(list) {
  return list.map((p, i) => ({ id: 'T' + (i + 1), x: p[0], y: p[1] }));
}

function mkScheme(name, voltage, weather, pts) {
  return {
    name,
    voltage,
    weather,
    status: '草稿', // 草稿 | 待复核 | 已审定
    towers: mkTowers(pts),
    snapshot: null, // 提交复核时的塔位快照（用于退回后比对改动）
    review: null, // 最近一轮复核 { round, spans: {档号:{result,comment}}, decision }
    draft: {}, // 复核员本轮填写的意见
    round: 0,
    history: [], // 历史复核轮次
  };
}

function defaultState() {
  return {
    schemes: {
      // 方案A：主走廊，穿越林区Ⅱ区与生态红线Ⅰ区，含陡坡塔位与个别长档
      A: mkScheme('方案A', '220kV', '最高气温', [
        [595, 3400], [763, 3412], [1100, 3300], [1995, 3500], [2695, 3445],
        [3201, 3625], [3290, 3645], [3409, 3635], [3576, 3620], [3900, 3495],
        [4795, 3295], [5495, 3395], [6195, 3450], [6374, 3419], [6449, 3384],
        [6700, 3395], [7475, 3595], [8295, 3680], [8551, 3639], [8671, 3649],
        [8800, 3660], [9400, 3730],
      ]),
      // 方案B：南线，档距普遍偏大，投资低但超标档多
      B: mkScheme('方案B', '220kV', '最高气温', [
        [400, 4100], [1390, 4345], [2350, 4645], [3190, 4300], [3700, 4155],
        [4195, 4150], [4495, 4225], [5095, 4195], [5995, 3950], [6430, 4013],
        [6895, 4245], [7415, 4398], [7600, 4395], [8500, 4100], [8800, 4060],
        [8907, 4028], [9300, 4145],
      ]),
      // 方案C：北线，避开林区与红线，塔位多但合规性好
      C: mkScheme('方案C', '220kV', '最高气温', [
        [500, 2100], [1058, 2110], [1495, 2000], [1855, 1965], [1968, 2040],
        [2320, 2200], [2894, 2212], [3100, 2300], [3513, 2238], [4045, 2295],
        [4413, 2038], [4900, 1900], [5380, 2108], [5980, 2195], [6498, 2355],
        [6895, 2395], [7219, 2462], [7390, 2408], [7765, 2300], [8268, 2388],
        [8650, 2595], [9300, 2500],
      ]),
    },
  };
}

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaultState();
    const s = JSON.parse(raw);
    if (!s.schemes || !s.schemes.A) return defaultState();
    return s;
  } catch {
    return defaultState();
  }
}

const [state, setState] = createStore(load());
const [view, setView] = createSignal('plan'); // plan | profile | review | output
const [active, setActive] = createSignal('A');

createEffect(() => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch { /* 存储不可用时忽略 */ }
});

export function useStore() {
  const scheme = () => state.schemes[active()];

  const editable = () => scheme().status === '草稿';

  function updateScheme(fn) {
    setState('schemes', active(), produce(fn));
  }

  // ---- 塔位编辑 ----
  function moveTower(i, x, y) {
    if (!editable()) return;
    updateScheme((s) => {
      s.towers[i].x = Math.round(x);
      s.towers[i].y = Math.round(y);
    });
  }
  function addTower(x, y) {
    if (!editable()) return;
    updateScheme((s) => {
      s.towers.push({ id: 'T' + (s.towers.length + 1), x: Math.round(x), y: Math.round(y) });
    });
  }
  function insertTower(afterIdx, x, y) {
    if (!editable()) return;
    updateScheme((s) => {
      s.towers.splice(afterIdx + 1, 0, { id: '', x: Math.round(x), y: Math.round(y) });
      s.towers.forEach((t, i) => (t.id = 'T' + (i + 1)));
    });
  }
  function deleteTower(i) {
    if (!editable()) return;
    updateScheme((s) => {
      if (s.towers.length <= 2) return;
      s.towers.splice(i, 1);
      s.towers.forEach((t, j) => (t.id = 'T' + (j + 1)));
    });
  }
  function setVoltage(v) {
    if (!editable()) return;
    updateScheme((s) => (s.voltage = v));
  }
  function setWeather(w) {
    if (!editable()) return;
    updateScheme((s) => (s.weather = w));
  }

  // ---- 复核流程 ----
  function submitReview() {
    updateScheme((s) => {
      if (s.towers.length < 2) return;
      s.snapshot = s.towers.map((t) => ({ x: t.x, y: t.y }));
      s.status = '待复核';
      s.draft = {};
    });
  }
  function setDraft(spanIdx, patch) {
    updateScheme((s) => {
      s.draft[spanIdx] = { result: '', comment: '', ...s.draft[spanIdx], ...patch };
    });
  }
  function decideReview(decision) {
    // decision: '审定' | '退回'
    updateScheme((s) => {
      const rec = { round: s.round + 1, spans: { ...s.draft }, decision };
      s.review = rec;
      s.history = [...(s.history || []), rec];
      s.round = s.round + 1;
      s.status = decision === '审定' ? '已审定' : '草稿';
      if (decision === '审定') s.snapshot = null;
    });
  }

  function resetAll() {
    const d = defaultState();
    setState('schemes', d.schemes);
  }

  return {
    state,
    scheme,
    view,
    setView,
    active,
    setActive,
    editable,
    moveTower,
    addTower,
    insertTower,
    deleteTower,
    setVoltage,
    setWeather,
    submitReview,
    setDraft,
    decideReview,
    resetAll,
  };
}
