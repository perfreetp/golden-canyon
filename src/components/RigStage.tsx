import { createMemo, createSignal, For, Show } from 'solid-js';
import { state, updateProject } from '../store/store';
import type { JointDef } from '../types';
import { forwardKinematics, keyframeFromPose, restPose, samplePose, type Pose } from '../rig/kinematics';
import { Figure } from './Figure';
import { angleTo, clamp } from '../util/math';

export type StageMode = 'bind' | 'pose' | 'preview';

interface RigStageProps {
  mode: StageMode;
  editingAngles: Record<string, number> | null;
  onEditingAnglesChange: (angles: Record<string, number>, rootX: number, rootY: number) => void;
  sampleTime: number;
  registerSvg?: (el: SVGSVGElement | null) => void;
}

function svgPoint(svg: SVGSVGElement, evt: { clientX: number; clientY: number }) {
  const pt = svg.createSVGPoint();
  pt.x = evt.clientX; pt.y = evt.clientY;
  return pt.matrixTransform(svg.getScreenCTM()!.inverse());
}

export function RigStage(props: RigStageProps) {
  let svgEl: SVGSVGElement | null = null;
  const [selected, setSelected] = createSignal<string | null>(null);

  const rest = createMemo(() => restPose(state.project.joints));

  const pose = createMemo<Pose>(() => {
    if (props.mode === 'bind') return rest();
    if (props.mode === 'preview') {
      const a = state.project.animations.find(x => x.id === state.project.activeAnimationId)!;
      return samplePose(state.project.joints, a.keyframes, a.eases, props.sampleTime);
    }
    // pose 模式：用当前编辑角度做 FK
    if (props.editingAngles) {
      const root = state.project.joints.find(j => !j.parent)!;
      const kf0 = state.project.animations
        .find(x => x.id === state.project.activeAnimationId)!
        .keyframes.sort((a, b) => a.time - b.time)[0];
      return forwardKinematics(
        state.project.joints,
        props.editingAngles,
        kf0?.rootX ?? root.x,
        kf0?.rootY ?? root.y,
      );
    }
    return rest();
  });

  // 绑定模式：拖关节改静止位置；姿势模式：拖关节旋转该骨骼
  const drag = (jointId: string) => (evt: MouseEvent) => {
    evt.preventDefault();
    const svg = svgEl!;
    const joint = state.project.joints.find(j => j.id === jointId)!;
    const onMove = (ev: MouseEvent) => {
      const p = svgPoint(svg, ev);
      if (props.mode === 'bind') {
        updateProject(pr => {
          const j = pr.joints.find(x => x.id === jointId);
          if (j) { j.x = clamp(p.x, 20, 580); j.y = clamp(p.y, 20, 580); }
        });
      } else if (props.mode === 'pose' && joint.parent) {
        const parentPt = pose().joints.get(joint.parent!)!;
        const ang = angleTo(parentPt.x, parentPt.y, p.x, p.y);
        const next = { ...(props.editingAngles ?? {}) };
        next[jointId] = ang;
        const root = pose().joints.get('pelvis')!;
        props.onEditingAnglesChange(next, root.x, root.y);
      }
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // 绑定模式：点击空白处新增自定义关节，双击自定义关节删除
  const onSvgDblClick = (evt: MouseEvent) => {
    if (props.mode !== 'bind') return;
    const target = evt.target as Element;
    if (target.tagName !== 'rect' && target.tagName !== 'svg') return;
    const p = svgPoint(svgEl!, evt);
    updateProject(pr => {
      const j: JointDef = {
        id: `custom_${Date.now().toString(36)}`, name: '自定义关节',
        parent: 'pelvis', x: clamp(p.x, 20, 580), y: clamp(p.y, 20, 580), custom: true,
      };
      pr.joints.push(j);
    });
  };

  return (
    <div class="stage-wrap">
      <svg
        ref={el => { svgEl = el; props.registerSvg?.(el); }}
        viewBox="0 0 600 600"
        class="stage"
        onDblClick={onSvgDblClick}
      >
        {/* 网格背景 */}
        <defs>
          <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#e2e8f0" stroke-width="0.6" />
          </pattern>
        </defs>
        <rect width="600" height="600" fill="url(#grid)" />
        <line x1="0" y1="560" x2="600" y2="560" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="8 6" />
        <text x="12" y="552" font-size="11" fill="#94a3b8">地面参考线</text>

        <Figure
          joints={state.project.joints}
          parts={state.project.parts}
          pose={pose()}
          showBones={props.mode !== 'preview'}
          showLabels={props.mode === 'bind'}
          activeJoint={selected()}
          onJointClick={(id, e) => {
            setSelected(id);
            drag(id)(e);
          }}
          onJointDblClick={id => {
            const j = state.project.joints.find(x => x.id === id);
            if (j?.custom) updateProject(pr => { pr.joints = pr.joints.filter(x => x.id !== id); });
          }}
        />

        <Show when={props.mode === 'bind'}>
          <text x="12" y="24" font-size="12" fill="#64748b">
            拖动关节调整静止骨架 · 双击空白新增自定义关节 · 双击自定义关节可删除
          </text>
        </Show>
        <Show when={props.mode === 'pose'}>
          <text x="12" y="24" font-size="12" fill="#64748b">
            拖动任意关节旋转骨骼调整姿势，完成后在时间轴打关键帧
          </text>
        </Show>
      </svg>
    </div>
  );
}

export { keyframeFromPose };
