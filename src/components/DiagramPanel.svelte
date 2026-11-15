<script>
  import * as d3 from 'd3';
  import { getTexture } from '../lib/texture.js';
  import { getArt, PANEL, KIND_COLOR, lesionRadius, formatSize, PART_LABEL } from '../lib/anatomy.js';
  import { annotationLines } from '../lib/lesions.js';

  let {
    part,
    caseData,
    textureKey,
    editable = false,
    selectedLesionId = null,
    selectedAnnotationId = null,
    activeIssueIds = [],
    showLabels = true,
    onSelectLesion = () => {},
    onSelectAnnotation = () => {},
    onDragLesion = () => {},
    onDragAnnotation = () => {},
    onOpenLesion = () => {},
    onOpenAnnotation = () => {}
  } = $props();

  const art = $derived(getArt(part));
  const tex = $derived(
    getTexture(part, textureKey || 'default', caseData?.params?.imageMode || '白光')
  );
  const lesions = $derived((caseData?.lesions || []).filter((l) => l.part === part));
  const annotations = $derived((caseData?.annotations || []).filter((a) => a.part === part));

  const W = PANEL.w;
  const H = PANEL.h;
  const partLabel = $derived(PART_LABEL[part]);

  const zLinePath = $derived.by(() => {
    const lm = art.landmarks.find((l) => l.type === 'zline');
    if (!lm) return '';
    return d3
      .line()
      .x((p) => p.x)
      .y((p) => p.y)
      .curve(d3.curveCatmullRom)(lm.points);
  });

  const issueByLesion = $derived.by(() => {
    const m = new Map();
    const pending = caseData?.issues || [];
    for (const l of lesions) {
      const ids = activeIssueIds.filter((id) => {
        const issue = pending.find((i) => i.id === id);
        return issue && issue.lesionIds?.includes(l.id);
      });
      if (ids.length) m.set(l.id, ids);
    }
    return m;
  });

  const issueByAnnotation = $derived.by(() => {
    const m = new Map();
    const pending = caseData?.issues || [];
    for (const a of annotations) {
      const ids = activeIssueIds.filter((id) => {
        const issue = pending.find((i) => i.id === id);
        return issue && issue.annotationIds?.includes(a.id);
      });
      if (ids.length) m.set(a.id, ids);
    }
    return m;
  });

  let svgEl = $state(null);

  // D3 owns the pointer mechanics; coordinates are mapped back into the
  // normalised panel space that the domain model stores.
  $effect(() => {
    if (!svgEl) return;
    const svg = d3.select(svgEl);

    const dragLesion = d3
      .drag()
      .filter((ev) => editable && ev.button === 0)
      .on('start', function (ev) {
        ev.sourceEvent?.stopPropagation();
      })
      .on('drag', function (ev) {
        const id = this.dataset.lesionId;
        const lesion = lesions.find((l) => l.id === id);
        if (!lesion) return;
        const rect = svgEl.getBoundingClientRect();
        const nx = lesion.x + ev.dx / rect.width;
        const ny = lesion.y + ev.dy / rect.height;
        onDragLesion(id, clamp(nx), clamp(ny));
      })
      .on('end', function (ev) {
        ev.sourceEvent?.stopPropagation();
      });

    const dragAnn = d3
      .drag()
      .filter((ev) => editable && ev.button === 0)
      .on('start', function (ev) {
        ev.sourceEvent?.stopPropagation();
      })
      .on('drag', function (ev) {
        const id = this.dataset.annId;
        const ann = annotations.find((a) => a.id === id);
        if (!ann) return;
        const rect = svgEl.getBoundingClientRect();
        const nx = ann.x + ev.dx / rect.width;
        const ny = ann.y + ev.dy / rect.height;
        onDragAnnotation(id, clamp(nx, 0, 1 - ann.w), clamp(ny, 0, 1 - ann.h));
      })
      .on('end', function (ev) {
        ev.sourceEvent?.stopPropagation();
      });

    svg.selectAll('g[data-lesion-id]').call(dragLesion);
    svg.selectAll('g[data-ann-id]').call(dragAnn);

    return () => {
      svg.selectAll('g[data-lesion-id]').on('.drag', null);
      svg.selectAll('g[data-ann-id]').on('.drag', null);
    };
  });

  function clamp(v, lo = 0.015, hi = 0.985) {
    return Math.max(lo, Math.min(hi, v));
  }

  /** Arrow keys nudge the focused marker or label by one pixel step. */
  function nudge(kind, id, event) {
    if (!editable) return;
    const step = event.shiftKey ? 0.02 : 0.004;
    const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0;
    const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0;
    if (!dx && !dy) return;
    event.preventDefault();
    if (kind === 'lesion') {
      const lesion = lesions.find((l) => l.id === id);
      if (lesion) onDragLesion(id, clamp(lesion.x + dx), clamp(lesion.y + dy));
    } else {
      const ann = annotations.find((a) => a.id === id);
      if (ann) onDragAnnotation(id, clamp(ann.x + dx, 0, 1 - ann.w), clamp(ann.y + dy, 0, 1 - ann.h));
    }
  }
</script>

<svg
  bind:this={svgEl}
  class="panel-svg"
  viewBox={`0 0 ${W} ${H}`}
  role="img"
  aria-label={`${partLabel}分段示意图`}
>
  <defs>
    <linearGradient id={`lum-${part}`} x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0%" stop-color={tex.palette.mottle} />
      <stop offset="38%" stop-color={tex.palette.base} />
      <stop offset="100%" stop-color={tex.palette.mid} />
    </linearGradient>
    <radialGradient id={`glow-${part}`} cx="0.46" cy="0.42" r="0.68">
      <stop offset="0%" stop-color={tex.palette.mottle} stop-opacity="0.65" />
      <stop offset="65%" stop-color={tex.palette.mottle} stop-opacity="0.14" />
      <stop offset="100%" stop-color={tex.palette.mottle} stop-opacity="0" />
    </radialGradient>
    <linearGradient id={`wall-${part}`} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color={tex.palette.wall} />
      <stop offset="55%" stop-color={tex.palette.shadow} />
      <stop offset="100%" stop-color={tex.palette.wall} />
    </linearGradient>
    <clipPath id={`clip-${part}`}>
      <path d={tex.lumenPath} />
    </clipPath>
    <filter id={`soft-${part}`} x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.6" />
    </filter>
    <filter id={`inner-${part}`} x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="3.2" result="blur" />
      <feOffset dx="1" dy="1.6" result="off" />
      <feComposite in="SourceAlpha" in2="off" operator="out" result="rim" />
      <feFlood flood-color={tex.palette.shadow} flood-opacity="0.6" />
      <feComposite in2="rim" operator="in" />
      <feComposite in2="SourceGraphic" operator="over" />
    </filter>
  </defs>

  <!-- mural wall -->
  <path d={tex.outlinePath} fill={`url(#wall-${part})`} fill-opacity="0.92" />
  <path
    d={tex.outlinePath}
    fill="none"
    stroke={tex.palette.shadow}
    stroke-opacity="0.4"
    stroke-width="0.8"
  />

  <!-- lumen -->
  <g clip-path={`url(#clip-${part})`}>
    <path d={tex.lumenPath} fill={`url(#lum-${part})`} />
    {#each tex.mottlePaths as p}
      <path d={p} fill={tex.palette.fold} fill-opacity="0.12" fill-rule="evenodd" stroke="none" />
    {/each}

    {#each tex.foldBands as band}
      <path
        d={band.path}
        fill="none"
        stroke={tex.palette.fold}
        stroke-width={band.weight}
        stroke-opacity="0.26"
        stroke-linejoin="round"
      />
    {/each}

    {#each tex.folds as path}
      <path
        d={path}
        fill="none"
        stroke={tex.palette.fold}
        stroke-width="1"
        stroke-opacity="0.3"
        stroke-linecap="round"
      />
    {/each}

    <path d={tex.lumenPath} fill={`url(#glow-${part})`} />

    {#each tex.ridges as d}
      <circle cx={d.x} cy={d.y} r={d.r} fill={tex.palette.mottle} fill-opacity={d.o} />
    {/each}

    <path d={tex.lumenPath} fill="none" stroke="none" filter={`url(#inner-${part})`} fill-opacity="1" />
    <path d={tex.lumenPath} fill="none" stroke={tex.palette.shadow} stroke-opacity="0.45" stroke-width="1.4" />
  </g>

  <!-- landmarks -->
  {#if part === 'esophagus'}
    <path
      d={zLinePath}
      fill="none"
      stroke="#a25148"
      stroke-width="1.5"
      stroke-opacity="0.6"
      stroke-dasharray="2.5 1.8"
    />
    <text x={W * 0.55} y={H * 0.912} class="landmark">齿状线</text>
  {:else if part === 'stomach'}
    <path
      d={`M ${W * 0.665},${H * 0.452} q 13,3 26,3`}
      fill="none"
      stroke={tex.palette.shadow}
      stroke-width="1.7"
      stroke-opacity="0.45"
    />
    <text x={W * 0.585} y={H * 0.499} class="landmark">胃角</text>
    <circle
      cx={W * 0.802}
      cy={H * 0.615}
      r="4"
      fill="none"
      stroke={tex.palette.shadow}
      stroke-width="1.3"
      stroke-opacity="0.65"
    />
    <text x={W * 0.818} y={H * 0.642} class="landmark">幽门</text>
  {:else}
    <circle
      cx={W * 0.702}
      cy={H * 0.428}
      r="3.2"
      fill="#d9a08c"
      stroke={tex.palette.shadow}
      stroke-width="1"
    />
    <text x={W * 0.728} y={H * 0.442} class="landmark">乳头</text>
    <text x={W * 0.305} y={H * 0.082} class="landmark">球部</text>
    <text x={W * 0.712} y={H * 0.622} class="landmark">降部</text>
    <text x={W * 0.445} y={H * 0.848} class="landmark">水平部</text>
  {/if}

  <!-- lesions -->
  {#each lesions as lesion (lesion.id)}
    {@const r = lesionRadius(part, lesion.longCm, lesion.shortCm)}
    {@const sel = selectedLesionId === lesion.id}
    {@const bad = issueByLesion.has(lesion.id)}
    <g
      class="lesion"
      class:sel
      class:bad
      class:editable
      data-lesion-id={lesion.id}
      role="button"
      tabindex="0"
      aria-label={`${lesion.region}${lesion.kind} ${formatSize(lesion.longCm, lesion.shortCm)}`}
      onpointerdown={() => onSelectLesion(lesion.id)}
      onkeydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectLesion(lesion.id);
        } else {
          nudge('lesion', lesion.id, e);
        }
      }}
      ondblclick={() => onOpenLesion(lesion.id)}
      transform={`translate(${lesion.x * W},${lesion.y * H})`}
    >
      {#if bad}
        <circle
          r={r + 7}
          fill="none"
          stroke="#b2332c"
          stroke-width="1.4"
          stroke-dasharray="3 2.5"
          opacity="0.9"
        />
      {/if}
      <circle
        r={r + 3}
        fill={KIND_COLOR[lesion.kind]}
        fill-opacity="0.14"
        filter={`url(#soft-${part})`}
      />
      <circle r={r} fill={KIND_COLOR[lesion.kind]} fill-opacity="0.22" />
      <circle
        r={r}
        fill="none"
        stroke={KIND_COLOR[lesion.kind]}
        stroke-width={sel ? 2.5 : 1.5}
        stroke-opacity="0.95"
      />
      <path
        d={`M${-r * 0.6},${-r * 0.08} q ${r * 0.5},${-r * 0.52} ${r * 1.2},0`}
        fill="none"
        stroke={KIND_COLOR[lesion.kind]}
        stroke-width="1"
        stroke-opacity="0.5"
      />
      <circle r={Math.max(2, r * 0.16)} fill={KIND_COLOR[lesion.kind]} fill-opacity="0.75" />
      {#if lesion.manualPos || lesion.manualSize}
        <g class="manual-mark" transform={`translate(${r + 5},${-r - 2})`}>
          <rect x="-3.8" y="-3.8" width="7.6" height="7.6" rx="2.2" fill="#0d6b76" opacity="0.95" />
          <path
            d="M-1.3,-1.5 l1.3,-1.2 1.3,1.2 M-1.3,1.5 l1.3,1.2 1.3,-1.2"
            stroke="#fff"
            stroke-width="0.95"
            fill="none"
            stroke-linecap="round"
          />
        </g>
      {/if}
      {#if sel && editable}
        <circle
          r={r + 1.5}
          fill="none"
          stroke="#0d6b76"
          stroke-width="1.8"
          stroke-dasharray="4 3"
          class="sel-ring"
        />
      {/if}
    </g>
  {/each}

  <!-- annotation labels -->
  {#if showLabels}
    {#each annotations as ann, i (ann.id)}
      {@const lesion = lesions.find((l) => l.id === ann.lesionId)}
      {@const lines = annotationLines(lesion, i + 1)}
      {@const sel = selectedAnnotationId === ann.id}
      {@const bad = issueByAnnotation.has(ann.id)}
      <g
        class="ann"
        class:sel
        class:bad
        class:editable
        data-ann-id={ann.id}
        role="button"
        tabindex="0"
        aria-label={`标注 ${lines.title} ${lines.detail}`}
        onpointerdown={() => onSelectAnnotation(ann.id)}
        onkeydown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectAnnotation(ann.id);
          } else {
            nudge('annotation', ann.id, e);
          }
        }}
        ondblclick={() => onOpenAnnotation(ann.id)}
        transform={`translate(${ann.x * W},${ann.y * H})`}
      >
        <rect
          width={ann.w * W}
          height={ann.h * H}
          rx="4"
          fill="#ffffff"
          fill-opacity={sel ? 0.99 : 0.93}
          stroke={bad ? '#b2332c' : sel ? '#0d6b76' : '#8299a2'}
          stroke-width={sel || bad ? 1.7 : 0.85}
        />
        <rect
          width="2.6"
          height={ann.h * H}
          rx="1.3"
          fill={lesion ? KIND_COLOR[lesion.kind] : '#8fa4ac'}
          opacity="0.9"
        />
        <text x="7" y={ann.h * H * 0.45} class="ann-title">{lines.title}</text>
        <text x="7" y={ann.h * H * 0.85} class="ann-detail">{lines.detail}</text>
        {#if ann.manual}
          <circle cx={ann.w * W - 6} cy="6.5" r="2.3" fill="#0d6b76" />
        {/if}
      </g>
    {/each}
  {/if}

  <!-- title cartouche -->
  <g class="cartouche" transform={`translate(${W - 84}, 8)`}>
    <rect
      width="76"
      height="18"
      rx="4"
      fill="#ffffff"
      fill-opacity="0.9"
      stroke="#c4d2d7"
      stroke-width="0.8"
    />
    <text x="38" y="12.5" text-anchor="middle" class="cart-text">{partLabel}分段</text>
  </g>
</svg>

<style>
  .panel-svg {
    display: block;
    width: 100%;
    height: auto;
    aspect-ratio: 320 / 384;
    background: #fbfdfd;
    border-radius: 6px;
  }
  .landmark {
    font-size: 6.4px;
    fill: #5f757e;
    letter-spacing: 0.04em;
  }
  .ann-title {
    font-size: 8.6px;
    font-weight: 600;
    fill: #16303a;
  }
  .ann-detail {
    font-size: 7.4px;
    fill: #5c7079;
  }
  .cart-text {
    font-size: 8px;
    fill: #4a5d66;
    letter-spacing: 0.12em;
  }
  .ann,
  .lesion {
    cursor: pointer;
  }
  :global(.editable) .ann,
  :global(.editable) .lesion {
    cursor: grab;
  }
  .sel-ring {
    animation: ringPulse 1.8s ease-in-out infinite;
  }
  @keyframes ringPulse {
    0%,
    100% {
      stroke-opacity: 0.85;
    }
    50% {
      stroke-opacity: 0.35;
    }
  }
</style>
