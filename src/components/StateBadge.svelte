<script>
  let { state, size = 'md' } = $props();

  const map = {
    draft: { name: '草稿', tone: 'neutral' },
    submitted: { name: '待复核', tone: 'accent' },
    rework: { name: '待整改', tone: 'high' },
    signed: { name: '已签名', tone: 'ok' },
    open: { name: '进行中', tone: 'accent' },
    released: { name: '已放行', tone: 'ok' }
  };
  const info = $derived(map[state] || { name: state, tone: 'neutral' });
</script>

<span class="pill {info.tone}" class:sm={size === 'sm'}>{info.name}</span>

<style>
  .sm {
    height: 18px;
    font-size: 10.5px;
    padding: 0 6px;
  }
</style>
