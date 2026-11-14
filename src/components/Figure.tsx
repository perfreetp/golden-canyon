import { For, Show, type JSX } from 'solid-js';
import type { JointDef, PartLayer } from '../types';
import type { Pose } from '../rig/kinematics';
import { placePart, restAngles } from '../rig/figureMath';

/** 未上传拆件图时的矢量人形部件 */
function PartShape(props: { part: PartLayer }) {
  const p = props.part;
  const w = p.width, h = p.height;
  const common = { fill: p.color, stroke: 'rgba(0,0,0,0.35)', 'stroke-width': 1.5 };
  if (p.id === 'p_head') {
    return (
      <g>
        <ellipse cx={0} cy={h * 0.42} rx={w * 0.46} ry={h * 0.42} {...common} />
        <circle cx={-w * 0.14} cy={h * 0.36} r={2.2} fill="#3a2a1c" stroke="none" />
        <circle cx={w * 0.14} cy={h * 0.36} r={2.2} fill="#3a2a1c" stroke="none" />
        <path d={`M ${-w * 0.12} ${h * 0.55} Q 0 ${h * 0.62} ${w * 0.12} ${h * 0.55}`} stroke="#8a5a44" fill="none" stroke-width={1.4} />
      </g>
    );
  }
  if (p.id === 'p_torso') {
    const top = w * 0.86;
    return <path d={`M ${-top / 2} 4 Q 0 -4 ${top / 2} 4 L ${w / 2} ${h * 0.82} Q 0 ${h} ${-w / 2} ${h * 0.82} Z`} {...common} />;
  }
  if (p.id.startsWith('p_foot')) {
    return <path d={`M ${-w / 2} 0 Q ${-w / 2} -${h * 0.55} 0 -${h * 0.55} L ${w * 0.34} -${h * 0.45} Q ${w / 2} -${h * 0.1} ${w * 0.42} ${h * 0.15} Z`} {...common} />;
  }
  if (p.id.startsWith('p_hand')) {
    return <ellipse cx={0} cy={h * 0.55} rx={w / 2} ry={h * 0.45} {...common} />;
  }
  return <rect x={-w / 2} y={0} width={w} height={h} rx={w * 0.38} ry={w * 0.38} {...common} />;
}

export interface FigureProps {
  joints: JointDef[];
  parts: PartLayer[];
  pose: Pose;
  showBones?: boolean;
  showLabels?: boolean;
  activeJoint?: string | null;
  onJointClick?: (id: string, evt: MouseEvent) => void;
  onJointDblClick?: (id: string, evt: MouseEvent) => void;
  background?: string;
  extra?: JSX.Element;
}

/** 深度顺序：先腿脚，再躯干，最后手臂与头 */
const Z_ORDER = [
  'p_thighL', 'p_thighR', 'p_shinL', 'p_shinR', 'p_footL', 'p_footR',
  'p_torso',
  'p_upperArmL', 'p_upperArmR', 'p_forearmL', 'p_forearmR', 'p_handL', 'p_handR',
  'p_head',
];

export function Figure(props: FigureProps) {
  const rest = () => restAngles(props.joints);
  const ordered = () => {
    const map = new Map(props.parts.map(p => [p.id, p]));
    return Z_ORDER.map(id => map.get(id)).filter(Boolean) as PartLayer[];
  };

  return (
    <g>
      <Show when={props.background}>
        <rect x={0} y={0} width={600} height={600} fill={props.background} />
      </Show>
      <For each={ordered()}>{part => {
        const place = () => placePart(part, props.joints, props.pose, rest());
        return (
          <Show when={place()}>
            {pl => (
              <g transform={`translate(${pl().x},${pl().y}) rotate(${pl().rotation})`} opacity={pl().opacity}>
                <Show when={part.imageDataUrl} fallback={<PartShape part={part} />}>
                  <image href={part.imageDataUrl} x={-part.width / 2} y={0} width={part.width} height={part.height} preserveAspectRatio="xMidYMin meet" />
                </Show>
              </g>
            )}
          </Show>
        );
      }}</For>

      <Show when={props.showBones}>
        <g>
          <For each={props.joints.filter(j => j.parent)}>{j => {
            const p = () => props.pose.joints.get(j.parent!)!;
            const c = () => props.pose.joints.get(j.id)!;
            return (
              <line
                x1={p().x} y1={p().y} x2={c().x} y2={c().y}
                stroke="#2dd4bf" stroke-width={2} stroke-dasharray="5 4" opacity={0.85}
              />
            );
          }}</For>
          <For each={props.joints}>{j => {
            const pt = () => props.pose.joints.get(j.id)!;
            return (
              <g
                style={{ cursor: props.onJointClick ? 'pointer' : 'default' }}
                onClick={e => props.onJointClick?.(j.id, e)}
                onDblClick={e => props.onJointDblClick?.(j.id, e)}
              >
                <circle
                  cx={pt().x} cy={pt().y} r={props.activeJoint === j.id ? 8 : 5.5}
                  fill={props.activeJoint === j.id ? '#f59e0b' : '#0f766e'}
                  stroke="#fff" stroke-width={1.5}
                />
                <Show when={props.showLabels}>
                  <text x={pt().x + 9} y={pt().y - 7} font-size="11" fill="#0f766e" font-weight={600}>
                    {j.name}
                  </text>
                </Show>
              </g>
            );
          }}</For>
        </g>
      </Show>
      {props.extra}
    </g>
  );
}
