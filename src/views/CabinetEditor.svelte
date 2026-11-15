<script>
  import {
    cabinets, figures, placements, lights,
    placeFigure, updatePlacement, removePlacement,
    saveCabinet, deleteCabinet, figureStatus, getFigure
  } from '../lib/store.svelte.js';
  import { allDisplayConflicts, conflictFigureSet } from '../lib/rules.js';
  import { figureHeightMm, fmtNum } from '../lib/utils.js';
  import Modal from '../components/Modal.svelte';
  import CabinetForm from '../components/CabinetForm.svelte';
  import { d3Drag } from '../lib/d3drag.js';

  const MARGIN = { left: 56, right: 24, top: 30, bottom: 44 };
  const SVG_W = 860;

  let cabId = $state(cabinets[0]?.id || null);
  $effect(() => { if (!cabId && cabinets.length) cabId = cabinets[0].id; });
  const cabinet = $derived(cabinets.find(c => c.id === cabId));
  const scaleK = $derived(cabinet ? Math.min((SVG_W - MARGIN.left - MARGIN.right) / cabinet.innerWidthMm, 0.62) : 0.5);
  const svgH = $derived(cabinet ? MARGIN.top + MARGIN.bottom + cabinet.innerHeightMm * scaleK : 400);

  const cabPlacements = $derived(placements.filter(p => p.cabinetId === cabId));
  const conflicts = $derived(allDisplayConflicts(placements, figures, cabinet?.shelves || []));
  const cabConflicts = $derived(conflicts.filter(c => c.shelfId && cabinet?.shelves.some(s => s.id === c.shelfId)));
  const badFigureIds = $derived(conflictFigureSet(cabConflicts));

  const unplaced = $derived(figures.filter(f => !placements.some(p => p.figureId === f.id) && figureStatus(f.id).status !== '借展中'));

  let showCabForm = $state(false);
  let editingCab = $state(null);
  let dragInfo = $state(null);
  let svgRef = $state(null);

  function X(mm) { return MARGIN.left + mm * scaleK; }
  function Y(mm) { return MARGIN.top + mm * scaleK; }

  function shelfOf(id) { return cabinet?.shelves.find(s => s.id === id); }
  function figOf(id) { return getFigure(id); }

  function shelfLoad(shelfId) {
    return cabPlacements.filter(p => p.shelfId === shelfId).reduce((s, p) => s + (figOf(p.figureId)?.weightG || 0), 0);
  }

  // 拖拽中：基于鼠标 mm 坐标吸附到最近层板
  function nearestShelf(yMm) {
    if (!cabinet) return null;
    let best = cabinet.shelves[0];
    for (const s of cabinet.shelves) if (Math.abs(s.yMm - yMm) < Math.abs(best.yMm - yMm)) best = s;
    return best;
  }

  const dragHandlers = {
    start(e) {
      const el = e.sourceEvent.target.closest('[data-drag]');
      if (!el) return;
      const type = el.dataset.drag;
      if (type === 'figure') {
        dragInfo = { kind: 'new', figureId: el.dataset.figureId, xMm: 0, yMm: 0, shelfId: null };
      } else {
        const p = placements.find(x => x.id === el.dataset.placementId);
        if (p) dragInfo = { kind: 'move', placementId: p.id, xMm: p.xMm, yMm: 0, shelfId: p.shelfId };
      }
    },
    move(e) {
      if (!dragInfo || !cabinet || !svgRef) return;
      const rect = svgRef.getBoundingClientRect();
      const xMm = (e.sourceEvent.clientX - rect.left - MARGIN.left) / scaleK;
      const yMm = (e.sourceEvent.clientY - rect.top - MARGIN.top) / scaleK;
      dragInfo.xMm = Math.max(0, Math.min(cabinet.innerWidthMm - 40, xMm));
      dragInfo.yMm = yMm;
      dragInfo.shelfId = nearestShelf(yMm)?.id || dragInfo.shelfId;
      dragInfo = { ...dragInfo };
    },
    end() {
      if (!dragInfo || !cabinet) { dragInfo = null; return; }
      const shelf = nearestShelf(dragInfo.yMm);
      if (!shelf) { dragInfo = null; return; }
      const fig = dragInfo.kind === 'new' ? getFigure(dragInfo.figureId) : figOf(placements.find(p => p.id === dragInfo.placementId)?.figureId);
      const widthMm = fig?.widthMm || 80;
      const xMm = Math.max(0, Math.min(cabinet.innerWidthMm - widthMm, Math.round(dragInfo.xMm)));
      if (dragInfo.kind === 'new') {
        placeFigure({ figureId: dragInfo.figureId, cabinetId: cabId, shelfId: shelf.id, xMm });
      } else {
        updatePlacement(dragInfo.placementId, { shelfId: shelf.id, xMm });
      }
      dragInfo = null;
    }
  };

  // 拖拽幽灵的像素位置
  const ghost = $derived(dragInfo && cabinet ? (() => {
    const fig = dragInfo.kind === 'new' ? getFigure(dragInfo.figureId) : figOf(placements.find(p => p.id === dragInfo.placementId)?.figureId);
    const shelf = shelfOf(dragInfo.shelfId);
    if (!fig || !shelf) return null;
    const h = figureHeightMm(fig) || 180;
    return { x: X(dragInfo.xMm), y: Y(shelf.yMm) - h * scaleK, w: fig.widthMm * scaleK, h: h * scaleK, name: fig.name };
  })() : null);

  function loadPct(s) {
    const load = shelfLoad(s.id);
    return Math.round((load / s.maxLoadG) * 100);
  }
</script>

<div class="toolbar">
  <div class="left">
    <select bind:value={cabId} style="width:200px">
      {#each cabinets as c (c.id)}<option value={c.id}>{c.name}</option>{/each}
    </select>
    <button class="sm" onclick={() => { editingCab = cabinet; showCabForm = true; }} disabled={!cabinet}>编辑展柜/层板</button>
    <button class="sm danger" onclick={() => cabinet && confirm(`删除展柜「${cabinet.name}」及其全部摆位？`) && deleteCabinet(cabinet.id)} disabled={!cabinet}>删除展柜</button>
  </div>
  <div class="right">
    <button class="primary" onclick={() => { editingCab = null; showCabForm = true; }}>+ 新建展柜</button>
  </div>
</div>

{#if !cabinet}
  <div class="empty">还没有展柜。点击「新建展柜」定义柜体尺寸、层板位置与承重上限。</div>
{:else}
  <div class="layout">
    <div class="card tight stage-card">
      <div class="stage-head">
        <strong>{cabinet.name}</strong>
        <span class="muted">立面图（柜内 {cabinet.innerWidthMm}×{cabinet.innerHeightMm}mm，比例尺 1:{Math.round(1 / scaleK)}）· 从右侧拖入藏品</span>
      </div>
      <div class="scroll-x">
        <svg bind:this={svgRef} class="svg-cabinet" width={SVG_W} height={svgH} viewBox="0 0 {SVG_W} {svgH}" use:d3Drag={dragHandlers}>
          <!-- 柜体框 -->
          <rect class="cabinet-frame" x={X(0)} y={Y(0)} width={cabinet.innerWidthMm * scaleK} height={cabinet.innerHeightMm * scaleK} rx="4" />

          <!-- 顶部标尺 -->
          {#each Array(Math.floor(cabinet.innerWidthMm / 100) + 1) as _, i}
            {@const mm = i * 100}
            <line x1={X(mm)} y1={Y(0)} x2={X(mm)} y2={Y(0) + 6} stroke="#8a7a60" />
            <text class="tick-label" x={X(mm)} y={Y(0) - 6} text-anchor="middle">{mm}</text>
          {/each}

          <!-- 层板 -->
          {#each cabinet.shelves as s (s.id)}
            {@const load = shelfLoad(s.id)}
            {@const over = load > s.maxLoadG}
            <line class="shelf-line" x1={X(0)} y1={Y(s.yMm)} x2={X(cabinet.innerWidthMm)} y2={Y(s.yMm)} />
            <text class="dim-label" x={X(0) - 8} y={Y(s.yMm) + 4} text-anchor="end">{s.name} · y={s.yMm}</text>
            <text class="dim-label {over ? 'over' : ''}" x={X(cabinet.innerWidthMm) + 6} y={Y(s.yMm) + 4}>
              承重 {load}/{s.maxLoadG}g {over ? '⚠ 超限' : `(${loadPct(s)}%)`}
            </text>
          {/each}

          <!-- 已陈列藏品 -->
          {#each cabPlacements as p (p.id)}
            {@const fig = figOf(p.figureId)}
            {@const s = shelfOf(p.shelfId)}
            {@const h = Math.round(figureHeightMm(fig) || 180)}
            {@const conflict = badFigureIds.has(p.figureId)}
            {#if fig && s && !(dragInfo?.kind === 'move' && dragInfo.placementId === p.id)}
              <g data-drag="placement" data-placement-id={p.id} class="fig-rect {conflict ? 'conflict' : ''}"
                 transform="translate({X(p.xMm)},{Y(s.yMm) - h * scaleK})">
                <rect width={p.widthMm * scaleK} height={h * scaleK} rx="5"
                      fill={conflict ? '#c0533f' : '#7d8a99'} fill-opacity="0.92" />
                <text class="fig-label" x={6} y={16}>{fig.name.length > 7 ? fig.name.slice(0, 7) + '…' : fig.name}</text>
                {#if h * scaleK >= 46}
                  <text class="fig-label" x={6} y={h * scaleK - 7}>{h}mm · {fig.scale}</text>
                {/if}
                {#if conflict}
                  <circle class="conflict-mark" cx={p.widthMm * scaleK - 8} cy={8} r="7" />
                  <text x={p.widthMm * scaleK - 8} y={12} text-anchor="middle" font-size="10" fill="#fff" font-weight="700">!</text>
                {/if}
                <!-- 高度尺寸线 -->
                <line x1={p.widthMm * scaleK + 5} y1="0" x2={p.widthMm * scaleK + 5} y2={h * scaleK} stroke="#a99e8d" stroke-dasharray="3 2" />
              </g>
            {/if}
          {/each}

          <!-- 间距 <30mm 标注 -->
          {#each cabConflicts.filter(c => c.type === 'spacing') as c (c.placementIds.join('-') + c.gapMm)}
            {@const pa = placements.find(p => p.id === c.placementIds[0])}
            {@const pb = placements.find(p => p.id === c.placementIds[1])}
            {@const s = shelfOf(c.shelfId)}
            {#if pa && pb && s}
              {@const x1 = X(pa.xMm + pa.widthMm)}
              {@const x2 = X(pb.xMm)}
              {@const yy = Y(s.yMm) + 14}
              <g>
                <line x1={x1} y1={yy} x2={x2} y2={yy} stroke="#b3402f" stroke-width="1.5" marker-start="url(#arrow)" marker-end="url(#arrow)" />
                <text x={(x1 + x2) / 2} y={yy + 14} text-anchor="middle" font-size="11" fill="#b3402f" font-weight="700">间距 {c.gapMm}mm &lt; 30</text>
              </g>
            {/if}
          {/each}

          <defs>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="#b3402f" />
            </marker>
          </defs>

          <!-- 拖拽幽灵 -->
          {#if ghost}
            <g transform="translate({ghost.x},{ghost.y})" opacity="0.75" pointer-events="none">
              <rect width={ghost.w} height={ghost.h} rx="5" fill="#9a6b2f" stroke="#7a521f" stroke-dasharray="5 3" />
              <text class="fig-label" x="6" y="16">{ghost.name.slice(0, 9)}</text>
            </g>
          {/if}
        </svg>
      </div>
      <p class="muted" style="margin:8px 4px 0;font-size:12.5px">
        操作：拖动右侧藏品到层板完成摆位；拖动柜内手办可换层/换位；双击柜内藏品撤下。高度按比例自动换算（1:7 = 真实身高 ÷ 7）。
      </p>
    </div>

    <div class="side">
      <!-- 待陈列藏品 -->
      <div class="card tight">
        <h3>待陈列藏品（{unplaced.length}）</h3>
        {#if unplaced.length === 0}
          <p class="muted" style="margin:8px 0 0">全部藏品均已陈列或借展中</p>
        {:else}
          <div class="palette" use:d3Drag={dragHandlers}>
            {#each unplaced as f (f.id)}
              <div class="palette-item" data-drag="figure" data-figure-id={f.id} title="拖到展柜中摆位">
                {#if f.photo}<img src={f.photo} alt="" />{:else}<div class="ph">🎎</div>{/if}
                <div>
                  <div style="font-weight:600;font-size:12.5px">{f.name}</div>
                  <div class="muted" style="font-size:11.5px">{f.scale} · {figureHeightMm(f) != null ? Math.round(figureHeightMm(f)) : '—'}mm · {f.widthMm}宽</div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- 实时冲突 -->
      <div class="card tight">
        <h3>实时校验 <span class="badge {cabConflicts.length ? 'red' : 'green'}">{cabConflicts.length ? `${cabConflicts.length} 项冲突` : '全部合格'}</span></h3>
        {#if cabConflicts.length === 0}
          <div class="alert green" style="margin-top:8px">层板承重与相邻间距均符合要求。</div>
        {:else}
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">
            {#each cabConflicts as c, i (i)}
              <div class="alert red">
                <div>
                  <strong>{c.type === 'load' ? '⚠ 承重超限' : '⚠ 间距不足'}</strong>
                  <div>{c.message}</div>
                  <div class="chip-list" style="margin-top:5px">
                    {#each c.figureIds as fid}<span class="chip">{figOf(fid)?.name}</span>{/each}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}

        <h3 style="margin-top:14px">层板负荷</h3>
        {#each cabinet.shelves as s (s.id)}
          {@const pct = loadPct(s)}
          <div style="margin:8px 0">
            <div style="display:flex;justify-content:space-between;font-size:12.5px">
              <span>{s.name}</span>
              <span class:over={pct > 100} class="num">{shelfLoad(s.id)}/{s.maxLoadG}g · {pct}%</span>
            </div>
            <div class="bar"><div class="bar-fill {pct > 100 ? 'over' : pct > 80 ? 'warn' : ''}" style="width:{Math.min(100, pct)}%"></div></div>
          </div>
        {/each}
      </div>

      <!-- 当前层位清单 -->
      <div class="card tight">
        <h3>本柜陈列清单（{cabPlacements.length}）</h3>
        <table>
          <thead><tr><th>藏品</th><th>层板</th><th>x/mm</th><th></th></tr></thead>
          <tbody>
            {#each cabPlacements as p (p.id)}
              <tr>
                <td>{figOf(p.figureId)?.name}</td>
                <td>{shelfOf(p.shelfId)?.name}</td>
                <td class="num">{p.xMm}</td>
                <td>
                  <button class="sm danger" onclick={() => removePlacement(p.id)}>撤下</button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  </div>
{/if}

{#if showCabForm}
  <Modal title={editingCab ? '编辑展柜' : '新建展柜'} onClose={() => (showCabForm = false)}>
    {#snippet children()}
      <CabinetForm cabinet={editingCab} onCancel={() => (showCabForm = false)} onSaved={() => (showCabForm = false)} />
    {/snippet}
  </Modal>
{/if}

<style>
  .layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 14px; align-items: start; }
  .stage-card { min-width: 0; }
  .stage-head { display: flex; flex-direction: column; gap: 2px; margin-bottom: 10px; }
  .side { display: flex; flex-direction: column; gap: 14px; }
  .palette { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; max-height: 260px; overflow-y: auto; }
  .palette-item {
    display: flex; gap: 8px; align-items: center; padding: 6px 8px;
    border: 1px dashed var(--line-strong); border-radius: 8px; cursor: grab; background: var(--panel-2);
  }
  .palette-item:hover { border-color: var(--accent); background: var(--accent-soft); }
  .palette-item:active { cursor: grabbing; }
  .palette-item img, .ph { width: 38px; height: 38px; border-radius: 6px; object-fit: cover; background: #e6ddcc; display: grid; place-items: center; font-size: 20px; }
  .bar { height: 8px; background: #e8e0d1; border-radius: 999px; overflow: hidden; margin-top: 3px; }
  .bar-fill { height: 100%; background: var(--green); transition: width .3s; }
  .bar-fill.warn { background: var(--amber); }
  .bar-fill.over { background: var(--red); }
  .over { color: var(--red); font-weight: 700; }
  @media (max-width: 1100px) { .layout { grid-template-columns: 1fr; } }
</style>
