<script>
  let { title = '', wide = false, onClose, children } = $props();
</script>

<div class="modal-mask" onclick={(e) => e.target === e.currentTarget && onClose?.()} role="dialog" aria-modal="true">
  <div class="modal {wide ? 'wide' : ''}">
    <div class="modal-head">
      <h2>{title}</h2>
      <button class="ghost" onclick={() => onClose?.()} aria-label="关闭">✕</button>
    </div>
    {@render children?.()}
  </div>
</div>
