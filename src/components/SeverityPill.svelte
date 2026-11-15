<script>
  let { severity, label, compact = false } = $props();
  const names = { high: '严重', medium: '一般', low: '提示' };
</script>

<span class="pill {severity}" class:compact>
  <span class="dot" style="background: currentColor"></span>
  {label || names[severity] || severity}
</span>

<style>
  .pill {
    height: 20px;
  }
  .compact {
    height: 18px;
    padding: 0 6px;
    font-size: 10.5px;
  }
  .dot {
    width: 5px;
    height: 5px;
  }
</style>
