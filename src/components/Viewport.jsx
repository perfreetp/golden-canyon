import { useEffect, useRef, useState } from 'react';
import { TerrainScene } from '../lib/scene3d.js';

export function Viewport({
  data,
  onPickTrail,
  onPickGun,
  onPickTerrain,
  onMoveNode,
  onCommand,
  drawMode,
  onDrawPoint,
  cursorPreview,
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cbRef = useRef({});
  // callbacks change between renders (e.g. a tool being armed), so always read
  // the latest through the ref rather than capturing them at mount
  cbRef.current = { onPickTrail, onPickGun, onPickTerrain, onMoveNode, onDrawPoint, cursorPreview };
  const [ready, setReady] = useState(false);
  const [tooltip, setTooltip] = useState(null);
  const hoverRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return undefined;
    const scene = new TerrainScene(mountRef.current);
    sceneRef.current = scene;
    setReady(true);
    onCommand?.(scene);

    const el = scene.renderer.domElement;
    let dragNode = null;
    let downAt = null;
    let moved = false;

    const rectOf = () => el.getBoundingClientRect();

    const onMove = (e) => {
      const cb = cbRef.current;
      if (dragNode) {
        const p = scene.pickTerrain(e.clientX, e.clientY);
        if (p) cb.onMoveNode?.(dragNode.trailId, dragNode.nodeIndex, p.x, p.z);
        return;
      }

      if (cb.cursorPreview) {
        const p = scene.pickTerrain(e.clientX, e.clientY);
        cb.cursorPreview(p);
      }

      const hit = scene.pickObject(e.clientX, e.clientY);
      hoverRef.current = hit;
      if (hit) {
        const rect = rectOf();
        setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, ...hit });
        el.style.cursor = 'pointer';
      } else {
        setTooltip(null);
        el.style.cursor = cb.cursorPreview ? 'crosshair' : 'grab';
      }
      if (moved) {
        /* keep tooltip following while orbiting */
      }
    };

    const onDown = (e) => {
      downAt = { x: e.clientX, y: e.clientY };
      moved = false;
      const node = scene.pickNode(e.clientX, e.clientY);
      if (node) {
        dragNode = node;
        scene.controls.enabled = false;
      }
    };

    const onUp = (e) => {
      scene.controls.enabled = true;
      if (dragNode) {
        dragNode = null;
        setTooltip(null);
        return;
      }
      if (!downAt) return;
      moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 4;
      downAt = null;
      if (moved) return;

      const cb = cbRef.current;
      // placing a device or drawing a line owns the click: the terrain wins
      // over whatever ribbon happens to be under the cursor
      if (cb.onPickTerrain) {
        const p = scene.pickTerrain(e.clientX, e.clientY);
        if (p) {
          cb.onPickTerrain(p);
          return;
        }
      }
      if (cb.cursorPreview) {
        const p = scene.pickTerrain(e.clientX, e.clientY);
        if (p) {
          cb.onDrawPoint?.(p);
          return;
        }
      }
      const hit = scene.pickObject(e.clientX, e.clientY);
      if (hit?.kind === 'gun') {
        cb.onPickGun?.(hit.gunId, hit.trailId);
        return;
      }
      if (hit?.kind === 'trail') {
        cb.onPickTrail?.(hit.trailId);
        return;
      }
      const p = scene.pickTerrain(e.clientX, e.clientY);
      if (p) cb.onPickTerrain?.(p);
    };

    const onLeave = () => {
      setTooltip(null);
      if (cbRef.current.cursorPreview) cbRef.current.cursorPreview(null);
    };

    const onDbl = (e) => {
      if (!cbRef.current.cursorPreview) return;
      e.preventDefault();
      cbRef.current.onDrawFinish?.();
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('dblclick', onDbl);

    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('dblclick', onDbl);
      scene.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const s = sceneRef.current;
    if (!s || !ready) return;
    s.setData(data);
  }, [data, ready]);

  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    s.drawMode = drawMode;
  }, [drawMode]);

  return (
    <div className="viewport-wrap" ref={mountRef} style={{ height: '100%', minHeight: 0 }}>
      {tooltip ? (
        <div className="tooltip" style={{ left: tooltip.x + 16, top: tooltip.y + 14 }}>
          <div className="tt-title">
            <span
              style={{
                width: 7, height: 7, borderRadius: 2,
                background: tooltip.kind === 'gun' ? '#4fe3c1' : tooltip.kind === 'node' ? '#fff' : '#5aa9ff',
              }}
            />
            {tooltip.kind === 'gun' ? `造雪设备 ${tooltip.gunId}` : tooltip.kind === 'node' ? `控制点 ${tooltip.nodeIndex + 1}（可拖动）` : '雪道'}
          </div>
          <div className="tt-row">
            {tooltip.kind === 'gun' ? '点击选中设备' : tooltip.kind === 'node' ? '拖动调整线位' : '点击选中雪道'}
          </div>
        </div>
      ) : null}
    </div>
  );
}

