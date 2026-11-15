<template>
  <div class="shell">
    <header class="topbar">
      <div class="brand">
        <span class="logo">◆</span>
        <h1>手办涂装分色与打样审批系统</h1>
      </div>
      <nav>
        <RouterLink to="/paint">涂装分色台</RouterLink>
        <RouterLink to="/qc">品控审批</RouterLink>
        <RouterLink to="/dashboard">主管看板</RouterLink>
        <RouterLink to="/workshop">车间分色表</RouterLink>
      </nav>
    </header>
    <main>
      <RouterView />
    </main>
  </div>
</template>

<style>
:root {
  --bg: #0f1115;
  --panel: #171a21;
  --panel2: #1e222b;
  --line: #2a2f3a;
  --fg: #e6e8ee;
  --dim: #9aa3b2;
  --accent: #4f8cff;
  --red: #e5484d;
  --green: #3fb68b;
  --amber: #e0a63f;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg); font: 14px/1.5 "Microsoft YaHei", "PingFang SC", system-ui, sans-serif; }
.shell { min-height: 100vh; display: flex; flex-direction: column; }
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 20px; height: 56px; background: var(--panel);
  border-bottom: 1px solid var(--line); flex-wrap: wrap; gap: 8px;
}
.brand { display: flex; align-items: center; gap: 10px; }
.logo { color: var(--accent); font-size: 20px; }
h1 { font-size: 16px; margin: 0; font-weight: 600; }
nav { display: flex; gap: 4px; flex-wrap: wrap; }
nav a {
  color: var(--dim); text-decoration: none; padding: 6px 14px;
  border-radius: 6px; font-size: 14px;
}
nav a.router-link-active { color: #fff; background: var(--accent); }
main { flex: 1; padding: 16px 20px; }
.panel { background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; }
.panel h3 { margin: 0 0 10px; font-size: 14px; color: var(--dim); font-weight: 600; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { text-align: left; padding: 7px 10px; border-bottom: 1px solid var(--line); }
th { color: var(--dim); font-weight: 600; }
button {
  background: var(--accent); color: #fff; border: 0; border-radius: 6px;
  padding: 7px 16px; cursor: pointer; font-size: 13px;
}
button.ghost { background: var(--panel2); color: var(--fg); border: 1px solid var(--line); }
button.danger { background: var(--red); }
button:disabled { opacity: 0.45; cursor: not-allowed; }
select, input, textarea {
  background: var(--panel2); color: var(--fg); border: 1px solid var(--line);
  border-radius: 6px; padding: 6px 8px; font-size: 13px;
}
.tag { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; }
.tag.待分色 { background: #3a3f4c; color: #cfd4de; }
.tag.分色中 { background: #274a7c; color: #a9ccff; }
.tag.待审批 { background: #6b5518; color: #ffd97a; }
.tag.退回 { background: #6e2a2d; color: #ffb3b6; }
.tag.通过 { background: #1f5c46; color: #8fe6c3; }
.err-text { color: var(--red); font-size: 12px; }
.swatch { display: inline-block; width: 16px; height: 16px; border-radius: 4px; vertical-align: -3px; border: 1px solid rgba(255,255,255,.25); }
</style>
