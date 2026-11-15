<script>
  let { angle = 0, large = false } = $props();
  // 页面会有多个实例，marker id 必须唯一
  let uid = $state(Math.random().toString(36).slice(2, 9));
</script>

<svg width={large ? 120 : 34} height={large ? 120 : 34} viewBox="0 0 100 100">
  <defs>
    <marker id="arrow-l-{uid}" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
      <path d="M0,0 L7,3.5 L0,7 z" fill="#b3402f" />
    </marker>
  </defs>
  <line x1="50" y1="12" x2="50" y2="46" stroke="#b7791f" stroke-width="3" />
  <circle cx="50" cy="10" r="7" fill="#f0e2c8" stroke="#b7791f" stroke-width="2" />
  {#key angle}
    <line x1="50" y1="46"
      x2={50 + 34 * Math.sin((angle * Math.PI) / 180)}
      y2={46 + 34 * Math.cos((angle * Math.PI) / 180)}
      stroke="#b3402f" stroke-width="3"
      marker-end="url(#arrow-l-{uid})" />
  {/key}
  <line x1="18" y1="82" x2="82" y2="82" stroke="#8a7a60" stroke-width="4" />
  <text x="50" y="97" text-anchor="middle" font-size="11" fill="#6b6257">{angle}°</text>
</svg>
