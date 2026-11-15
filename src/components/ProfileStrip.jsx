import { useMemo, useRef, useState } from 'react';

// Longitudinal profile of a trail: distance vs elevation, with the grade
// banded, warning intervals shaded, and uncovered sections hatched in red.
export function ProfileStrip({ trail, analysis, height = 116, onHoverIndex }) {
  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);

  const model = useMemo(() => {
    if (!analysis || analysis.segments.length < 2) return null;
    const segs = analysis.segments;
    const W = 1000;
    const H = height;
    const padL = 6;
    const padR = 6;
    const padT = 10;
    const padB = 16;
    const len = analysis.length || 1;
    const ys = segs.map((s) => s.y);
    const yMin = Math.min(...ys);
    const yMax = Math.max(...ys);
    const span = Math.max(1, yMax - yMin);

    const xOf = (s) => padL + (s / len) * (W - padL - padR);
    const yOf = (y) => padT + (1 - (y - yMin) / span) * (H - padT - padB);

    const points = segs.map((s) => `${xOf(s.s).toFixed(1)},${yOf(s.y).toFixed(1)}`);
    const area = `${padL},${H - padB} ${points.join(' ')} ${W - padR},${H - padB}`;

    const warnBands = (analysis.warnings || []).map((w) => ({
      x1: xOf(w.startS),
      x2: xOf(w.endS),
      type: w.type,
    }));
    const gapBands = (analysis.uncovered || []).map((u) => ({ x1: xOf(u.startS), x2: xOf(u.endS) }));

    // grade line normalised 0..42 degrees
    const gradePts = segs.map((s) => {
      const gx = xOf(s.s);
      const gy = H - padB - Math.max(-8, Math.min(45, s.slope)) * 1.35;
      return `${gx.toFixed(1)},${Math.max(padT, gy).toFixed(1)}`;
    });

    return { W, H, padL, padR, padT, padB, len, xOf, yOf, points, area, warnBands, gapBands, gradePts, segs };
  }, [analysis, height]);

  if (!model) return <div className="empty">暂无剖面数据</div>;
  const { W, H, padL, padR, padB, points, area, warnBands, gapBands, gradePts, xOf, segs } = model;
  const levelColor = trail?.level === 'beginner' ? '#4ade9b' : trail?.level === 'advanced' ? '#ff6b6b' : '#5aa9ff';
  const hoverSeg = hover != null ? segs[hover] : null;

  const onMove = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < segs.length; i += 1) {
      const d = Math.abs(xOf(segs[i].s) - px);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    setHover(best);
    onHoverIndex?.(best);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%', display: 'block', cursor: 'crosshair' }}
        onPointerMove={onMove}
        onPointerLeave={() => {
          setHover(null);
          onHoverIndex?.(null);
        }}
      >
        <defs>
          <linearGradient id="profFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={levelColor} stopOpacity="0.34" />
            <stop offset="100%" stopColor={levelColor} stopOpacity="0.03" />
          </linearGradient>
          <pattern id="profGap" width="7" height="7" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <rect width="7" height="7" fill="rgba(255,80,80,0.14)" />
            <line x1="0" y1="0" x2="0" y2="7" stroke="rgba(255,80,80,0.75)" strokeWidth="2.2" />
          </pattern>
        </defs>

        {/* uncovered hatching */}
        {gapBands.map((b, i) => (
          <rect
            key={`g${i}`}
            x={b.x1}
            y={6}
            width={Math.max(1, b.x2 - b.x1)}
            height={H - padB - 6}
            fill="url(#profGap)"
          />
        ))}

        {/* warning bands */}
        {warnBands.map((b, i) => (
          <rect
            key={`w${i}`}
            x={b.x1}
            y={6}
            width={Math.max(2, b.x2 - b.x1)}
            height={H - padB - 6}
            fill="rgba(247,192,90,0.10)"
            stroke="rgba(247,192,90,0.3)"
            strokeWidth="0.8"
          />
        ))}

        {/* gradient grid */}
        {[0, 15, 30, 45].map((v) => {
          const gy = H - padB - v * 1.35;
          if (gy < 8) return null;
          return (
            <line key={v} x1={padL} y1={gy} x2={W - padR} y2={gy} stroke="rgba(148,178,214,0.10)" strokeWidth="1" strokeDasharray="2 4" />
          );
        })}

        <polygon points={area} fill="url(#profFill)" />
        <polyline points={points.join(' ')} fill="none" stroke={levelColor} strokeWidth="1.8" strokeLinejoin="round" />

        {/* grade curve */}
        <polyline
          points={gradePts.join(' ')}
          fill="none"
          stroke="rgba(247,192,90,0.55)"
          strokeWidth="1.1"
          strokeDasharray="4 3"
        />

        {/* reverse markers */}
        {segs.map((s, i) =>
          s.reverse ? (
            <circle key={`r${i}`} cx={xOf(s.s)} cy={H - padB - Math.max(-8, Math.min(45, s.slope)) * 1.35} r="2.4" fill="#ff6b6b" />
          ) : null,
        )}

        {/* hover crosshair */}
        {hoverSeg ? (
          <>
            <line x1={xOf(hoverSeg.s)} y1={4} x2={xOf(hoverSeg.s)} y2={H - padB} stroke="rgba(255,255,255,0.35)" strokeWidth="1" />
            <circle cx={xOf(hoverSeg.s)} cy={segs[hover].y != null ? H - padB : 0} r="0" />
            <circle cx={xOf(hoverSeg.s)} cy={model.yOf(hoverSeg.y)} r="3" fill="#fff" />
          </>
        ) : null}
      </svg>

      <div style={{ position: 'absolute', left: 10, top: 6, fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--text-3)', letterSpacing: '0.08em' }}>
        纵剖面 · 高程 / 坡度
      </div>
      <div style={{ position: 'absolute', right: 10, top: 6, display: 'flex', gap: 10, fontFamily: 'var(--mono)', fontSize: 9.5, color: 'var(--text-3)' }}>
        <span>坡度参考线 15° / 30° / 45°</span>
      </div>
      {hoverSeg ? (
        <div
          style={{
            position: 'absolute',
            left: `calc(${(xOf(hoverSeg.s) / W) * 100}% - 60px)`,
            top: 4,
            padding: '4px 8px',
            borderRadius: 5,
            background: 'rgba(6,13,21,.94)',
            border: '1px solid var(--line-strong)',
            fontFamily: 'var(--mono)',
            fontSize: 10,
            whiteSpace: 'nowrap',
            color: 'var(--text-2)',
            pointerEvents: 'none',
          }}
        >
          {hoverSeg.s.toFixed(0)} m · {hoverSeg.y.toFixed(0)} m · 坡度 {hoverSeg.slope.toFixed(1)}° · 宽 {hoverSeg.width.toFixed(0)} m
        </div>
      ) : null}
    </div>
  );
}
