<script>
  let { name, size = 14, stroke = 1.7, color = 'currentColor' } = $props();

  const paths = {
    check: 'M3 8.2 6.4 11.6 13 4.6',
    x: 'M4 4 12 12 M12 4 4 12',
    alert: 'M8 2.6 14.2 13.4H1.8L8 2.6Z M8 6.4v3.2 M8 11.4v.1',
    info: 'M8 13.4A5.4 5.4 0 1 0 8 2.6a5.4 5.4 0 0 0 0 10.8Z M8 7.2v3.4 M8 5v.1',
    plus: 'M8 3v10 M3 8h10',
    refresh: 'M13.4 8a5.4 5.4 0 1 1-1.6-3.8 M13.6 2.2v3.2h-3.2',
    chevronRight: 'M6 3.4 10.6 8 6 12.6',
    chevronDown: 'M3.4 6 8 10.6l4.6-4.6',
    search: 'M7.2 12.4a5.2 5.2 0 1 0 0-10.4 5.2 5.2 0 0 0 0 10.4Z M11.2 11.2 14 14',
    download: 'M8 2.6v7.4 M4.8 7.4 8 10.6l3.2-3.2 M3 12.6h10',
    doc: 'M4 2.2h5.4L12.8 5.6v8.2H4V2.2Z M9.4 2.2v3.4H12.8',
    layers: 'M8 2.4 14 5.6 8 8.8 2 5.6 8 2.4Z M2 8.4 8 11.6 14 8.4 M2 11 8 14.2 14 11',
    shield: 'M8 2.2 13.4 4v4.2c0 3-2.4 5-5.4 5.6-3-.6-5.4-2.6-5.4-5.6V4L8 2.2Z',
    hand: 'M5.6 8.2V3.6a1 1 0 0 1 2 0v3.8 M7.6 7.4V2.8a1 1 0 0 1 2 0v4.6 M9.6 7.8V4a1 1 0 0 1 2 0v5 M11.6 9V6.2a1 1 0 0 1 2 0v5.2c0 2.6-1.8 4.4-4.4 4.4H8.4c-1.6 0-2.6-.8-3.4-2l-2-3.2a1 1 0 0 1 1.6-1.2l1.4 1.8',
    grid: 'M2.6 2.6h10.8v10.8H2.6V2.6Z M2.6 6.4h10.8 M6.4 2.6v10.8',
    arrowLeft: 'M13 8H3 M6.4 4.4 2.8 8l3.6 3.6',
    clock: 'M8 13.4A5.4 5.4 0 1 0 8 2.6a5.4 5.4 0 0 0 0 10.8Z M8 5.2V8l2 1.6',
    user: 'M8 8.4a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z M3.2 13.4c0-2.4 2.2-3.8 4.8-3.8s4.8 1.4 4.8 3.8',
    filter: 'M2.6 3.4h10.8 M4.6 8h6.8 M6.6 12.6h2.8',
    lock: 'M4.4 7.4V5.6a3.6 3.6 0 0 1 7.2 0v1.8 M3.6 7.4h8.8v6.2H3.6V7.4Z',
    unlock: 'M4.4 7.4V5.6a3.6 3.6 0 0 1 6.8-1.7 M3.6 7.4h8.8v6.2H3.6V7.4Z',
    eye: 'M1.8 8s2.4-4 6.2-4 6.2 4 6.2 4-2.4 4-6.2 4S1.8 8 1.8 8Z M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
    spark: 'M8 2.4l1.4 3.8L13.4 8l-4 1.8L8 13.6 6.6 9.8 2.6 8l4-1.8L8 2.4Z',
    trash: 'M3.4 4.6h9.2 M6.2 4.6V3h3.6v1.6 M4.6 4.6l.6 8.4h5.6l.6-8.4',
    corner: 'M3.4 3.4h4v4h-4v-4Z M8.6 8.6h4v4h-4v-4Z M7.4 5.4h3v1',
    target: 'M8 13.4A5.4 5.4 0 1 0 8 2.6a5.4 5.4 0 0 0 0 10.8Z M8 10.2A2.2 2.2 0 1 0 8 5.8a2.2 2.2 0 0 0 0 4.4Z'
  };
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 16 16"
  fill="none"
  stroke={color}
  stroke-width={stroke}
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <path d={paths[name] || paths.info} />
</svg>
