// Svelte action：把 d3-drag 挂到 SVG 容器上，通过事件委托识别 [data-drag] 元素
import { drag } from 'd3-drag';
import { select } from 'd3-selection';

export function d3Drag(node, handlers) {
  const behavior = drag()
    .container(node)
    .subject((event) => {
      const target = event.sourceEvent.target.closest?.('[data-drag]');
      return target ? { target } : null;
    })
    .on('start', (event) => handlers?.start?.(event))
    .on('drag', (event) => handlers?.move?.(event))
    .on('end', (event) => handlers?.end?.(event));

  const sel = select(node);
  sel.call(behavior);

  return {
    update(next) {
      handlers = next;
      behavior
        .on('start', (event) => handlers?.start?.(event))
        .on('drag', (event) => handlers?.move?.(event))
        .on('end', (event) => handlers?.end?.(event));
    },
    destroy() {
      sel.on('.drag', null);
    }
  };
}
