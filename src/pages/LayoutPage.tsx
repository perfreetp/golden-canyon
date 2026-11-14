import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  Copy,
  Crosshair,
  Grid3x3,
  Layers,
  Magnet,
  Maximize2,
  Monitor,
  MousePointer2,
  Move,
  Ruler,
  RotateCw,
  Scaling,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { HALL } from '../data/hall';
import { BODY_PARTS, DIFFICULTIES, gamesForKind, libItem } from '../data/library';
import { HallEditor } from '../editor/HallEditor';
import {
  applySnap,
  fmt,
  issuesForDevice,
  rectFor,
  validateLayout,
  zoneFor,
  zoneLoad,
} from '../lib/geometry';
import { useApp } from '../store';
import type { DeviceInstance, DeviceKind, LibraryItem, Role } from '../types';
import { InfoBanner, Seg, StatusChip } from '../components/UI';

const KIND_ICON: Record<string, React.ReactNode> = {
  'tracking-screen': <Monitor size={16} />,
  'balance-board': <Move size={16} />,
  'grip-station': <Crosshair size={16} />,
  'cognitive-table': <Layers size={16} />,
  camera: <Camera size={16} />,
  speaker: <Ruler size={16} />,
};

export function LayoutPage({ role }: { role: Role }) {
  const devices = useApp((s) => s.devices);
  const selectedId = useApp((s) => s.selectedId);
  const select = useApp((s) => s.select);
  const addDevice = useApp((s) => s.addDevice);
  const updateDevice = useApp((s) => s.updateDevice);
  const updateAttrs = useApp((s) => s.updateAttrs);
  const removeDevice = useApp((s) => s.removeDevice);
  const duplicateDevice = useApp((s) => s.duplicateDevice);
  const pushToast = useApp((s) => s.pushToast);
  const showGrid = useApp((s) => s.showGrid);
  const showZones = useApp((s) => s.showZones);
  const showIssues = useApp((s) => s.showIssues);
  const setToggle = useApp((s) => s.setToggle);

  const editable = role === 'therapist';
  const hostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HallEditor | null>(null);
  const [snapHint, setSnapHint] = useState<string | null>(null);
  const [blockTick, setBlockTick] = useState(0);
  const [dragKind, setDragKind] = useState<DeviceKind | null>(null);
  const [zoom, setZoom] = useState(100);

  const devicesRef = useRef(devices);
  devicesRef.current = devices;
  const roleRef = useRef(role);
  roleRef.current = role;

  useEffect(() => {
    const editor = new HallEditor({
      onSelect: (id) => select(id),
      onTransform: (id, t, commit) => {
        updateDevice(id, { x: t.x, z: t.z, rot: t.rot, w: t.w, d: t.d });
        if (commit) {
          // commit is handled by store update; nothing else needed
        }
      },
      onBlocked: (message) => {
        pushToast(message, 'error');
        setBlockTick((n) => n + 1);
      },
      onSnapHint: (hint) => setSnapHint(hint),
      onView: (pct) => setZoom(pct),
    });
    editorRef.current = editor;
    if (import.meta.env.DEV) {
      (window as unknown as { __editor?: HallEditor }).__editor = editor;
    }
    if (hostRef.current) {
      void editor.init(hostRef.current).then(() => {
        editor.setDevices(devicesRef.current);
        editor.setEditable(roleRef.current === 'therapist');
        editor.setSelection(useApp.getState().selectedId);
      });
    }
    return () => {
      editor.destroy();
      editorRef.current = null;
    };
  }, [select, updateDevice, pushToast]);

  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.setDevices(devices);
  }, [devices]);

  useEffect(() => {
    editorRef.current?.setSelection(selectedId);
  }, [selectedId]);

  useEffect(() => {
    editorRef.current?.setEditable(editable);
  }, [editable]);

  useEffect(() => {
    editorRef.current?.setLayers({ grid: showGrid, zones: showZones });
  }, [showGrid, showZones]);

  const issues = useMemo(() => validateLayout(devices), [devices, blockTick]);
  const selected = devices.find((d) => d.id === selectedId) ?? null;
  const selectedIssues = selected ? issuesForDevice(issues, selected.id) : [];

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const id = useApp.getState().selectedId;
      if ((e.key === 'Delete' || e.key === 'Backspace') && id && editable) {
        e.preventDefault();
        removeDevice(id);
      }
      if (e.key === 'Escape') select(null);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && id && editable) {
        e.preventDefault();
        duplicateDevice(id);
      }
      if (e.key === 'r' && id && editable) {
        const d = devicesRef.current.find((x) => x.id === id);
        if (!d) return;
        updateDevice(id, { rot: d.rot + Math.PI / 12 });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [select, removeDevice, duplicateDevice, updateDevice, editable]);

  const placeAt = (kind: DeviceKind, clientX: number, clientY: number) => {
    const lib = libItem(kind);
    editorRef.current?.clearGhost();
    setDragKind(null);
    const p = editorRef.current?.screenToHall(clientX, clientY);
    if (!p) return;
    const snapped = applySnap({ x: p.x, z: p.z, w: lib.width, d: lib.depth, rot: 0 }, lib.mount);
    const ok = editorRef.current?.canPlace(
      { x: snapped.x, z: snapped.z, rot: snapped.rot },
      undefined,
      lib.width,
      lib.depth,
    );
    if (!ok) {
      pushToast('该位置与已有展项重叠或超出展厅，无法放置', 'error');
      return;
    }
    addDevice(kind, snapped.x, snapped.z);
  };

  const onDragStartLib = (e: React.DragEvent, item: LibraryItem) => {
    if (!editable) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/device-kind', item.id);
    e.dataTransfer.effectAllowed = 'copy';
    setDragKind(item.id);
  };

  const onDragOverHost = (e: React.DragEvent) => {
    if (!dragKind) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const lib = libItem(dragKind);
    const p = editorRef.current?.screenToHall(e.clientX, e.clientY);
    if (!p) return;
    editorRef.current?.showDropGhost({ x: p.x, z: p.z, w: lib.width, d: lib.depth, rot: 0 }, lib.mount);
  };

  const onDropHost = (e: React.DragEvent) => {
    e.preventDefault();
    const kind = (e.dataTransfer.getData('text/device-kind') || dragKind) as DeviceKind | null;
    if (!kind) return;
    placeAt(kind, e.clientX, e.clientY);
  };

  const onDragLeaveHost = () => {
    editorRef.current?.clearGhost();
  };

  const startPointerDrag = (kind: DeviceKind) => {
    if (!editable) return;
    setDragKind(kind);
    const lib = libItem(kind);
    const host = hostRef.current;
    if (!host) return;
    const overHall = (x: number) => {
      const r = host.getBoundingClientRect();
      return x >= r.left && x <= r.right;
    };
    const move = (x: number, y: number) => {
      const p = editorRef.current?.screenToHall(x, y);
      if (!p) return;
      if (overHall(x)) {
        editorRef.current?.showDropGhost({ x: p.x, z: p.z, w: lib.width, d: lib.depth, rot: 0 }, lib.mount);
      } else {
        editorRef.current?.clearGhost();
      }
    };
    const up = (x: number, y: number) => {
      window.removeEventListener('pointermove', pm);
      window.removeEventListener('pointerup', pu);
      window.removeEventListener('pointercancel', cancel);
      if (overHall(x)) placeAt(kind, x, y);
      else {
        editorRef.current?.clearGhost();
        setDragKind(null);
      }
    };
    const pm = (ev: PointerEvent) => move(ev.clientX, ev.clientY);
    const pu = (ev: PointerEvent) => up(ev.clientX, ev.clientY);
    const cancel = () => {
      window.removeEventListener('pointermove', pm);
      window.removeEventListener('pointerup', pu);
      window.removeEventListener('pointercancel', cancel);
      editorRef.current?.clearGhost();
      setDragKind(null);
    };
    window.addEventListener('pointermove', pm);
    window.addEventListener('pointerup', pu);
    window.addEventListener('pointercancel', cancel);
  };

  const zoomBy = (f: number) => {
    editorRef.current?.zoomBy(f);
  };
  const fitView = () => {
    editorRef.current?.fit();
  };

  return (
    <div style={{ display: 'flex', gap: 14, height: '100%', minHeight: 0 }}>
      {/* ---------- library ---------- */}
      <aside
        className="layout-panel lib-panel"
        style={{
          width: 224,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          minHeight: 0,
          overflow: 'auto',
        }}
      >
        <div className="card">
          <div className="card-head" style={{ paddingBottom: 11 }}>
            <div style={{ flex: 1 }}>
              <div className="card-title">设备库</div>
              <div className="card-sub">拖拽到平面图，或单击自动落位</div>
            </div>
            <Magnet size={15} color="#0f766e" />
          </div>
          <div style={{ padding: '6px 8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(['floor', 'wall'] as const).map((mount) => (
              <div key={mount}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#9aa9a5',
                    letterSpacing: 1,
                    padding: '7px 6px 4px',
                  }}
                >
                  {mount === 'floor' ? '地面展项 · 0.5m 网格吸附' : '墙面展项 · 自动贴墙'}
                </div>
                {LIB_ORDER.filter((l) => l.mount === mount).map((lib) => (
                  <div
                    key={lib.id}
                    draggable={editable}
                    onDragStart={(e) => onDragStartLib(e, lib)}
                    onDragEnd={() => {
                      setDragKind(null);
                      editorRef.current?.clearGhost();
                    }}
                    onPointerDown={(e) => {
                      // touch / pen: press and drag straight onto the plan
                      if (e.pointerType === 'mouse') return;
                      e.preventDefault();
                      startPointerDrag(lib.id);
                    }}
                    onClick={() => {
                      // click-to-add: drops the device in the first free spot
                      if (!editable) return;
                      const spot = editorRef.current?.findFreeSpot(lib);
                      if (!spot) {
                        pushToast('展厅内已没有足够的空位，请先移动或删除展项', 'error');
                        return;
                      }
                      addDevice(lib.id, spot.x, spot.z);
                    }}
                    style={{
                      display: 'flex',
                      gap: 9,
                      alignItems: 'center',
                      padding: '8px 8px',
                      borderRadius: 10,
                      border: '1px solid #eef4f2',
                      background: dragKind === lib.id ? '#ecfdf5' : '#fff',
                      cursor: editable ? 'grab' : 'not-allowed',
                      opacity: editable ? 1 : 0.55,
                      marginBottom: 5,
                      transition: 'background .15s, border-color .15s',
                    }}
                    title={editable ? lib.blurb : '当前身份无布置权限'}
                  >
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 9,
                        background: lib.color,
                        color: '#fff',
                        display: 'grid',
                        placeItems: 'center',
                        flex: '0 0 auto',
                        boxShadow: `0 3px 8px ${lib.color}33`,
                      }}
                    >
                      {KIND_ICON[lib.id]}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 12.3, fontWeight: 650, letterSpacing: -0.1 }}>{lib.name}</div>
                      <div className="mono" style={{ fontSize: 10, color: '#869894', marginTop: 1 }}>
                        {fmt(lib.width, 2)}×{fmt(lib.depth, 2)}m · {lib.weightKg}kg
                        {lib.screenInches ? ` · ${lib.screenInches}"` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-head" style={{ padding: '11px 14px' }}>
            <div className="card-title" style={{ fontSize: 12.5 }}>
              展厅底图
            </div>
            <span className="chip chip-teal" style={{ marginLeft: 'auto' }}>
              预置
            </span>
          </div>
          <div style={{ padding: '10px 14px 13px', fontSize: 11.5, color: '#5d716c', lineHeight: 1.75 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>净尺寸</span>
              <b className="mono" style={{ color: '#0b2b27' }}>
                {HALL.width} × {HALL.depth} m
              </b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>吊顶净高</span>
              <b className="mono" style={{ color: '#0b2b27' }}>{HALL.ceiling} m</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>均布荷载</span>
              <b className="mono" style={{ color: '#0b2b27' }}>{HALL.defaultLoad} kg/m²</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>配电点位</span>
              <b className="mono" style={{ color: '#0b2b27' }}>{HALL.powerPoints.length} 处</b>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head" style={{ padding: '11px 14px' }}>
            <div className="card-title" style={{ fontSize: 12.5 }}>
              承重分区
            </div>
          </div>
          <div style={{ padding: '6px 12px 12px' }}>
            {HALL.zones.map((z) => {
              const load = zoneLoad(devices, z.id);
              const pct = Math.min(100, (load / z.capacity) * 100);
              const over = load > z.capacity;
              return (
                <div key={z.id} style={{ padding: '6px 2px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                    <span style={{ fontWeight: 600 }}>{z.name}</span>
                    <span className="mono" style={{ color: over ? '#dc2626' : '#869894', fontWeight: 600 }}>
                      {load}/{z.capacity}kg
                    </span>
                  </div>
                  <div style={{ height: 4, background: '#eef4f2', borderRadius: 99, marginTop: 4, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.max(pct, load > 0 ? 3 : 0)}%`,
                        height: '100%',
                        borderRadius: 99,
                        background: over ? '#dc2626' : pct > 75 ? '#f59e0b' : '#0d9488',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* ---------- canvas ---------- */}
      <section style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div
          className="card"
          style={{ flex: 1, minHeight: 0, position: 'relative', overflow: 'hidden', display: 'flex' }}
        >
          <div
            ref={hostRef}
            onDragOver={onDragOverHost}
            onDrop={onDropHost}
            onDragLeave={onDragLeaveHost}
            style={{ flex: 1, minWidth: 0, position: 'relative', touchAction: 'none' }}
          />

          {/* floating toolbar */}
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              display: 'flex',
              gap: 6,
              background: 'rgba(255,255,255,.94)',
              backdropFilter: 'blur(10px)',
              border: '1px solid #e2ece9',
              borderRadius: 11,
              padding: 5,
              boxShadow: '0 4px 18px rgba(11,43,39,.08)',
            }}
          >
            <ToolBtn onClick={() => zoomBy(1.2)} title="放大">
              <ZoomIn size={15} />
            </ToolBtn>
            <ToolBtn onClick={() => zoomBy(1 / 1.2)} title="缩小">
              <ZoomOut size={15} />
            </ToolBtn>
            <ToolBtn onClick={fitView} title="适应画布">
              <Maximize2 size={15} />
            </ToolBtn>
            <div style={{ width: 1, background: '#e8f0ee', margin: '3px 2px' }} />
            <ToolBtn onClick={() => setToggle('showGrid', !showGrid)} active={showGrid} title="网格">
              <Grid3x3 size={15} />
            </ToolBtn>
            <ToolBtn onClick={() => setToggle('showZones', !showZones)} active={showZones} title="承重分区">
              <Layers size={15} />
            </ToolBtn>
            <div
              className="mono"
              style={{
                fontSize: 10.5,
                color: '#869894',
                display: 'grid',
                placeItems: 'center',
                padding: '0 6px',
                minWidth: 42,
              }}
            >
              {zoom}%
            </div>
          </div>

          {/* snap hint */}
          {snapHint && (
            <div
              style={{
                position: 'absolute',
                bottom: 14,
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#0b2b27',
                color: '#d7efe9',
                fontSize: 11.5,
                padding: '6px 12px',
                borderRadius: 99,
                display: 'flex',
                gap: 6,
                alignItems: 'center',
                boxShadow: '0 6px 20px rgba(11,43,39,.25)',
              }}
            >
              <Magnet size={12} /> {snapHint}
            </div>
          )}

          {!editable && (
            <div
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: 'rgba(255,255,255,.94)',
                border: '1px solid #e2ece9',
                borderRadius: 10,
                padding: '7px 11px',
                fontSize: 11,
                color: '#5d716c',
                display: 'flex',
                gap: 6,
                alignItems: 'center',
              }}
            >
              <MousePointer2 size={13} /> 只读视图 · 可平移缩放查看
            </div>
          )}

          {issues.length > 0 && showIssues && (
            <div
              style={{
                position: 'absolute',
                bottom: 14,
                right: 14,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 10,
                padding: '8px 11px',
                fontSize: 11,
                color: '#991b1b',
                maxWidth: 320,
                display: 'flex',
                gap: 7,
                alignItems: 'flex-start',
              }}
            >
              <AlertTriangle size={14} style={{ flex: '0 0 auto', marginTop: 1 }} />
              <div>
                <b>{issues.length} 项布局问题</b>
                <div style={{ marginTop: 2, lineHeight: 1.5 }}>{issues[0].message}</div>
              </div>
            </div>
          )}
        </div>

        <div className="card hint-bar" style={{ padding: '9px 13px', display: 'flex', gap: 16, alignItems: 'center', fontSize: 11, color: '#6d807b', flexWrap: 'wrap' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <MousePointer2 size={12} /> 单击选中 · 拖动移动
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <RotateCw size={12} /> 顶部圆柄旋转 15°
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Scaling size={12} /> 角点缩放
          </span>
          <span className="hint-extra" style={{ marginLeft: 'auto', color: '#9aa9a5' }}>滚轮缩放 · 空白处拖动平移 · Del 删除</span>
        </div>
      </section>

      {/* ---------- inspector ---------- */}
      <aside
        className="layout-panel inspect-panel"
        style={{
          width: 306,
          minHeight: 0,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {selected ? (
          <Inspector
            key={selected.id}
            device={selected}
            editable={editable}
            issues={selectedIssues}
            onUpdate={(patch) => updateDevice(selected.id, patch)}
            onAttrs={(patch) => updateAttrs(selected.id, patch)}
            onDelete={() => removeDevice(selected.id)}
            onDuplicate={() => duplicateDevice(selected.id)}
          />
        ) : (
          <NoSelection devices={devices} onPick={select} />
        )}
      </aside>
    </div>
  );
}

const LIB_ORDER = ['tracking-screen', 'balance-board', 'grip-station', 'cognitive-table', 'camera', 'speaker'].map(
  (id) => libItem(id as DeviceKind),
);

function ToolBtn({
  children,
  onClick,
  title,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 28,
        height: 28,
        borderRadius: 7,
        display: 'grid',
        placeItems: 'center',
        color: active ? '#0b6b63' : '#6d807b',
        background: active ? '#ecfdf5' : 'transparent',
      }}
    >
      {children}
    </button>
  );
}

function NoSelection({ devices, onPick }: { devices: DeviceInstance[]; onPick: (id: string | null) => void }) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="card-head">
        <div style={{ flex: 1 }}>
          <div className="card-title">展项清单</div>
          <div className="card-sub">{devices.length} 个展项 · 点击定位</div>
        </div>
      </div>
      <div style={{ maxHeight: 560, overflow: 'auto', padding: '6px 8px 10px' }}>
        {devices.map((d) => {
          const lib = libItem(d.libId);
          const zone = zoneFor(rectFor(d));
          return (
            <button
              key={d.id}
              onClick={() => onPick(d.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                width: '100%',
                padding: '8px 8px',
                borderRadius: 9,
                textAlign: 'left',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f7faf9')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span
                style={{
                  width: 6,
                  height: 26,
                  borderRadius: 99,
                  background: lib.color,
                  flex: '0 0 auto',
                }}
              />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {d.name}
                </span>
                <span className="mono" style={{ fontSize: 10, color: '#869894' }}>
                  ({fmt(d.x, 2)}, {fmt(d.z, 2)}) · {zone?.id ?? '—'} 区
                </span>
              </span>
              <StatusChip status={d.status} />
            </button>
          );
        })}
      </div>
      <div style={{ borderTop: '1px solid #eef4f2' }}>
        <InfoBanner tone="info">
          从左侧设备库拖入展项即可开始布置。靠墙展项在靠近墙体时会自动吸附墙面对齐，地面展项自动吸附 0.5m 网格。
        </InfoBanner>
      </div>
    </div>
  );
}

function Inspector({
  device,
  editable,
  issues,
  onUpdate,
  onAttrs,
  onDelete,
  onDuplicate,
}: {
  device: DeviceInstance;
  editable: boolean;
  issues: ReturnType<typeof issuesForDevice>;
  onUpdate: (patch: Partial<DeviceInstance>) => void;
  onAttrs: (patch: Partial<DeviceInstance['attrs']>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const lib = libItem(device.libId);
  const games = gamesForKind(device.libId);
  const zone = zoneFor(rectFor(device));
  const disabled = !editable;

  return (
    <>
      <div className="card" style={{ overflow: 'hidden' }}>
        <div
          style={{
            padding: '14px 15px 13px',
            background: `linear-gradient(135deg, ${lib.color}, ${lib.color}dd)`,
            color: '#fff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: 'rgba(255,255,255,.18)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              {KIND_ICON[device.libId]}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: -0.2 }}>{lib.name}</div>
              <div style={{ fontSize: 10.5, opacity: 0.82 }}>
                {lib.mount === 'wall' ? '墙面安装' : '落地安装'} · {lib.weightKg}kg · {lib.powerW}W
              </div>
            </div>
            <StatusChip status={device.status} />
          </div>
        </div>

        <div className="card-body" style={{ paddingTop: 12 }}>
          <div className="field">
            <label className="field-label">展项名称</label>
            <input
              className="input"
              value={device.name}
              disabled={disabled}
              onChange={(e) => onUpdate({ name: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
            <CoordField label="X 坐标" value={device.x} onChange={(v) => onUpdate({ x: v })} disabled={disabled} />
            <CoordField label="Z 坐标" value={device.z} onChange={(v) => onUpdate({ z: v })} disabled={disabled} />
            <SizeField label="宽 W (m)" value={device.w} onChange={(v) => onUpdate({ w: v })} disabled={disabled} min={0.35} />
            <SizeField label="深 D (m)" value={device.d} onChange={(v) => onUpdate({ d: v })} disabled={disabled} min={0.15} />
          </div>

          <div className="field" style={{ marginTop: 10 }}>
            <label className="field-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>旋转角度</span>
              <span className="mono" style={{ color: '#0f766e' }}>
                {Math.round(((device.rot * 180) / Math.PI + 360) % 360)}°
              </span>
            </label>
            {lib.mount === 'wall' ? (
              <>
                <Seg
                  value={String(Math.round(((device.rot * 180) / Math.PI + 360) % 360)) as string}
                  options={[
                    { value: '0', label: '北墙 0°' },
                    { value: '90', label: '西墙 90°' },
                    { value: '180', label: '南墙 180°' },
                    { value: '270', label: '东墙 270°' },
                  ]}
                  onChange={(v) => onUpdate({ rot: (Number(v) * Math.PI) / 180 })}
                  disabled={disabled}
                />
                <div className="field-hint" style={{ marginTop: 4 }}>
                  墙面展项旋转锁定为墙面法线方向，拖动时自动贴墙对齐
                </div>
              </>
            ) : (
              <input
                type="range"
                min={0}
                max={345}
                step={15}
                value={Math.round(((device.rot * 180) / Math.PI + 360) % 360)}
                disabled={disabled}
                onChange={(e) => onUpdate({ rot: (Number(e.target.value) * Math.PI) / 180 })}
                style={{ accentColor: '#0f766e' }}
              />
            )}
          </div>

          <div
            style={{
              marginTop: 11,
              display: 'flex',
              gap: 6,
              fontSize: 10.8,
              color: '#6d807b',
              flexWrap: 'wrap',
            }}
          >
            <span className="chip chip-neutral">
              <Magnet size={10} /> {lib.mount === 'wall' ? '贴墙吸附' : '0.5m 网格'}
            </span>
            <span className="chip chip-neutral">承重区 {zone?.id ?? '—'}</span>
            <span className="chip chip-neutral">中心 ({fmt(device.x, 2)}, {fmt(device.z, 2)})</span>
          </div>
        </div>
      </div>

      {issues.length > 0 && (
        <div className="card" style={{ padding: 12 }}>
          {issues.map((i, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: 7,
                fontSize: 11.2,
                color: i.severity === 'error' ? '#b91c1c' : '#b45309',
                lineHeight: 1.55,
                alignItems: 'flex-start',
              }}
            >
              <AlertTriangle size={13} style={{ flex: '0 0 auto', marginTop: 1 }} />
              <span>{i.message}</span>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <div style={{ flex: 1 }}>
            <div className="card-title">训练参数</div>
            <div className="card-sub">提交审核时随展项一并送审</div>
          </div>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          <div className="field">
            <label className="field-label">训练部位</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {BODY_PARTS.map((part) => {
                const on = device.attrs.bodyParts.includes(part);
                return (
                  <button
                    key={part}
                    disabled={disabled}
                    onClick={() => {
                      const next = on
                        ? device.attrs.bodyParts.filter((p) => p !== part)
                        : [...device.attrs.bodyParts, part];
                      if (next.length === 0) return;
                      onAttrs({ bodyParts: next });
                    }}
                    className={`chip ${on ? 'chip-teal' : 'chip-neutral'}`}
                    style={{
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      height: 23,
                      opacity: disabled ? 0.6 : 1,
                    }}
                  >
                    {on && <Check size={10} />} {part}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="field">
            <label className="field-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>适用年龄</span>
              <span className="mono" style={{ color: '#0f766e' }}>
                {device.attrs.ageMin}–{device.attrs.ageMax} 岁
              </span>
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <input
                type="number"
                className="input"
                min={2}
                max={device.attrs.ageMax}
                value={device.attrs.ageMin}
                disabled={disabled}
                onChange={(e) =>
                  onAttrs({ ageMin: Math.max(2, Math.min(Number(e.target.value), device.attrs.ageMax)) })
                }
              />
              <span style={{ color: '#9aa9a5', fontSize: 11 }}>至</span>
              <input
                type="number"
                className="input"
                min={device.attrs.ageMin}
                max={18}
                value={device.attrs.ageMax}
                disabled={disabled}
                onChange={(e) =>
                  onAttrs({ ageMax: Math.min(18, Math.max(Number(e.target.value), device.attrs.ageMin)) })
                }
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className="field">
              <label className="field-label">单次时长（分钟）</label>
              <input
                type="number"
                className="input"
                min={3}
                max={30}
                value={device.attrs.durationMin}
                disabled={disabled}
                onChange={(e) => onAttrs({ durationMin: Math.max(3, Math.min(30, Number(e.target.value))) })}
              />
            </div>
            <div className="field">
              <label className="field-label">每日场次上限</label>
              <input
                type="number"
                className="input"
                min={1}
                max={30}
                value={device.attrs.dailyCap}
                disabled={disabled}
                onChange={(e) => onAttrs({ dailyCap: Math.max(1, Math.min(30, Number(e.target.value))) })}
              />
            </div>
          </div>

          <div className="field">
            <label className="field-label">难度档位</label>
            <Seg
              value={device.attrs.difficulty}
              options={DIFFICULTIES.map((d) => ({ value: d, label: d }))}
              onChange={(v) => onAttrs({ difficulty: v })}
              disabled={disabled}
            />
          </div>

          <div className="divider" style={{ margin: '2px 0' }} />

          <div className="field">
            <label className="field-label">绑定训练小游戏</label>
            <select
              className="select"
              value={device.content.gameId ?? ''}
              disabled={disabled}
              onChange={(e) => {
                const g = games.find((x) => x.id === e.target.value);
                onUpdate({ content: { ...device.content, gameId: e.target.value || null, threshold: g?.threshold ?? device.content.threshold } });
              }}
            >
              <option value="">未绑定</option>
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} · {g.metric}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="field-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>达标阈值（{games.find((g) => g.id === device.content.gameId)?.metric ?? '得分'}）</span>
              <span className="mono" style={{ color: '#0f766e' }}>
                {device.content.threshold}%
              </span>
            </label>
            <input
              type="range"
              min={30}
              max={95}
              step={5}
              value={device.content.threshold}
              disabled={disabled}
              onChange={(e) => onUpdate({ content: { ...device.content, threshold: Number(e.target.value) } })}
              style={{ accentColor: '#0f766e' }}
            />
          </div>
        </div>
      </div>

      {editable && (
        <div style={{ display: 'flex', gap: 7 }}>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onDuplicate}>
            <Copy size={13} /> 复制
          </button>
          <button className="btn btn-danger" style={{ flex: 1 }} onClick={onDelete}>
            <Trash2 size={13} /> 删除
          </button>
        </div>
      )}
    </>
  );
}

function CoordField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <input
        type="number"
        step={0.5}
        className="input mono"
        value={Number(value.toFixed(2))}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function SizeField({
  label,
  value,
  onChange,
  disabled,
  min,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  min: number;
}) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <input
        type="number"
        step={0.05}
        min={min}
        className="input mono"
        value={Number(value.toFixed(2))}
        disabled={disabled}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value)))}
      />
    </div>
  );
}
