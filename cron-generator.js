(() => {
  const presets = {
    everyMinute: "* * * * *",
    every5Minutes: "*/5 * * * *",
    every15Minutes: "*/15 * * * *",
    hourly: "0 * * * *",
    daily: "0 0 * * *",
    daily9: "0 9 * * *",
    weekdays9: "0 9 * * 1-5",
    weekly: "0 0 * * 0",
    monthly: "0 0 1 * *",
  };

  const state = { mode: "preset", preset: "daily9", minute: "0", hour: "9", dom: "*", month: "*", dow: "*", command: "" };

  const style = document.createElement("style");
  style.textContent = `
    .cron-card { display:grid; gap:18px; padding:20px; border:1px solid var(--border); border-radius:16px; background:var(--surface); box-shadow:var(--shadow-sm); }
    .cron-hero { display:flex; justify-content:space-between; align-items:flex-start; gap:18px; }
    .cron-hero h3 { margin:4px 0; font-size:20px; letter-spacing:-.04em; }
    .cron-hero p { margin:0; max-width:760px; color:var(--muted); font-size:11px; }
    .cron-icon { display:grid; place-items:center; width:42px; height:42px; border:1px solid rgba(99,91,255,.2); border-radius:12px; background:var(--accent-soft); color:var(--accent); font-size:17px; }
    .cron-tabs { display:flex; gap:5px; padding:4px; width:max-content; max-width:100%; overflow:auto; border:1px solid var(--border); border-radius:10px; background:var(--surface-2); }
    .cron-tab { padding:8px 12px; border-radius:7px; background:transparent; color:var(--muted); cursor:pointer; font-size:10px; font-weight:700; }
    .cron-tab.active { background:var(--surface); color:var(--text); box-shadow:var(--shadow-sm); }
    .cron-grid { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:8px; }
    .cron-field { display:flex; flex-direction:column; gap:6px; }
    .cron-field span { color:var(--muted); font-size:10px; font-weight:700; }
    .cron-field small { color:var(--muted-2); font-size:9px; }
    .cron-field input, .cron-field select { width:100%; }
    .cron-presets { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:7px; }
    .cron-preset { padding:10px 11px; border:1px solid var(--border); border-radius:9px; background:var(--surface-2); color:var(--muted); cursor:pointer; text-align:left; font-size:10px; }
    .cron-preset:hover { border-color:var(--border-strong); color:var(--text); transform:translateY(-1px); }
    .cron-preset strong { display:block; color:var(--text); margin-bottom:2px; font-size:10px; }
    .cron-preset code { color:var(--accent); font:10px 'DM Mono',monospace; }
    .cron-output-wrap { display:grid; gap:8px; }
    .cron-output-head { display:flex; justify-content:space-between; align-items:center; gap:8px; }
    .cron-output-head span { color:var(--muted); font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; }
    .cron-expression { width:100%; min-height:70px; margin:0; padding:15px; border:1px solid #252b38; border-radius:10px; background:#10141c; color:#d9e0ec; font:18px/1.6 'DM Mono',monospace; resize:none; text-align:center; }
    .cron-description { margin:0; padding:10px 12px; border:1px solid var(--border); border-radius:9px; background:var(--surface-2); color:var(--muted); font-size:11px; }
    .cron-command { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:7px; }
    .cron-command input { width:100%; }
    .cron-actions { display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; }
    .cron-actions-right { display:flex; gap:7px; flex-wrap:wrap; }
    .cron-hint { color:var(--muted-2); font-size:10px; }
    @media(max-width:760px) { .cron-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } .cron-presets { grid-template-columns:1fr 1fr; } .cron-hero { flex-direction:column; } }
    @media(max-width:480px) { .cron-grid, .cron-presets { grid-template-columns:1fr; } }
  `;
  document.head.appendChild(style);

  function createSection() {
    const section = document.createElement("section");
    section.id = "cron-section";
    section.className = "tool-section";
    section.style.display = "none";
    section.innerHTML = `
      <div class="section-heading"><div><span class="section-kicker">Schedule & automate</span><h2>Crontab Generator</h2><p>Build valid 5-field cron expressions visually, then copy the expression or a complete crontab line.</p></div></div>
      <div class="cron-card">
        <div class="cron-hero"><div><span class="section-kicker">Cron expressions</span><h3>Schedule jobs without memorising syntax</h3><p>Use presets for common schedules or compose minute, hour, day, month and weekday fields yourself.</p></div><div class="cron-icon"><i class="fas fa-clock"></i></div></div>
        <div class="cron-tabs" role="tablist"><button class="cron-tab active" data-mode="preset">Presets</button><button class="cron-tab" data-mode="custom">Custom expression</button></div>
        <div id="cron-preset-panel">
          <div class="cron-presets">
            <button class="cron-preset" data-preset="everyMinute"><strong>Every minute</strong><code>* * * * *</code></button>
            <button class="cron-preset" data-preset="every5Minutes"><strong>Every 5 minutes</strong><code>*/5 * * * *</code></button>
            <button class="cron-preset" data-preset="every15Minutes"><strong>Every 15 minutes</strong><code>*/15 * * * *</code></button>
            <button class="cron-preset" data-preset="hourly"><strong>Every hour</strong><code>0 * * * *</code></button>
            <button class="cron-preset" data-preset="daily9"><strong>Every day at 09:00</strong><code>0 9 * * *</code></button>
            <button class="cron-preset" data-preset="weekdays9"><strong>Weekdays at 09:00</strong><code>0 9 * * 1-5</code></button>
            <button class="cron-preset" data-preset="weekly"><strong>Every Sunday</strong><code>0 0 * * 0</code></button>
            <button class="cron-preset" data-preset="monthly"><strong>First day monthly</strong><code>0 0 1 * *</code></button>
          </div>
        </div>
        <div id="cron-custom-panel" hidden>
          <div class="cron-grid">
            <label class="cron-field"><span>Minute</span><input id="cron-minute" value="0" placeholder="*" /><small>0–59</small></label>
            <label class="cron-field"><span>Hour</span><input id="cron-hour" value="9" placeholder="*" /><small>0–23</small></label>
            <label class="cron-field"><span>Day of month</span><input id="cron-dom" value="*" placeholder="*" /><small>1–31</small></label>
            <label class="cron-field"><span>Month</span><input id="cron-month" value="*" placeholder="*" /><small>1–12</small></label>
            <label class="cron-field"><span>Day of week</span><input id="cron-dow" value="*" placeholder="*" /><small>0–7 · Sun=0/7</small></label>
          </div>
        </div>
        <div class="cron-output-wrap">
          <div class="cron-output-head"><span>Cron expression</span><span id="cron-description-label">Every day at 09:00</span></div>
          <textarea id="cron-expression" class="cron-expression" readonly>* * * * *</textarea>
          <p id="cron-description" class="cron-description"></p>
        </div>
        <div class="cron-command"><input id="cron-command" type="text" placeholder="Optional command, e.g. /usr/bin/node /app/worker.js" /><button id="cron-copy-line" class="secondary-action"><i class="fas fa-terminal"></i> Copy line</button></div>
        <div class="cron-actions"><span class="cron-hint"><i class="fas fa-circle-info"></i> Standard 5-field Unix cron syntax</span><div class="cron-actions-right"><button id="cron-copy" class="secondary-action"><i class="fas fa-copy"></i> Copy expression</button><button id="cron-generate" class="primary-action"><i class="fas fa-wand-magic-sparkles"></i> Generate</button></div></div>
      </div>`;
    return section;
  }

  function addSidebarItem() {
    const group = document.querySelector(".feature-group");
    if (!group || document.querySelector('.feature-item[onclick*="cron"]')) return;
    const button = document.createElement("button");
    button.className = "feature-item";
    button.setAttribute("onclick", "switchMode('cron')");
    button.innerHTML = '<span class="feature-icon"><i class="fas fa-clock"></i></span><span class="feature-copy"><strong>Crontab Generator</strong><small>Build cron schedules</small></span><kbd>8</kbd>';
    const uuid = group.querySelector('.feature-item[onclick*="uuid"]');
    if (uuid) group.insertBefore(button, uuid.nextSibling);
    else group.appendChild(button);
  }

  function patchSwitchMode() {
    if (window.__cronSwitchModePatched || typeof window.switchMode !== "function") return;
    const original = window.switchMode;
    window.switchMode = function(mode) {
      const cron = document.getElementById("cron-section");
      if (cron) cron.style.display = "none";
      original(mode);
      if (mode === "cron") {
        if (cron) cron.style.display = "block";
        document.querySelectorAll(".feature-item").forEach((item) => item.classList.remove("active"));
        document.querySelector('.feature-item[onclick*="cron"]')?.classList.add("active");
        const title = document.getElementById("page-title");
        if (title) title.textContent = "Crontab Generator";
        document.body.classList.remove("sidebar-open");
      }
    };
    window.__cronSwitchModePatched = true;
  }

  function expression() { return [state.minute,state.hour,state.dom,state.month,state.dow].join(" "); }

  function describe() {
    const e = expression();
    const map = Object.fromEntries(Object.entries(presets).map(([key,value]) => [value,key]));
    const names = { everyMinute:"Every minute", every5Minutes:"Every 5 minutes", every15Minutes:"Every 15 minutes", hourly:"Every hour", daily:"Every day at midnight", daily9:"Every day at 09:00", weekdays9:"Every weekday at 09:00", weekly:"Every Sunday at midnight", monthly:"At midnight on the first day of every month" };
    if (map[e]) return names[map[e]];
    if (state.minute === "*" && state.hour === "*" && state.dom === "*" && state.month === "*" && state.dow === "*") return "Every minute";
    return `Runs when minute=${state.minute}, hour=${state.hour}, day=${state.dom}, month=${state.month}, weekday=${state.dow}`;
  }

  function render() {
    document.getElementById("cron-expression").value = expression();
    document.getElementById("cron-description").textContent = describe();
    document.getElementById("cron-description-label").textContent = describe();
  }

  function loadPreset(key) {
    const value = presets[key];
    if (!value) return;
    [state.minute,state.hour,state.dom,state.month,state.dow] = value.split(" ");
    ["minute","hour","dom","month","dow"].forEach((field) => document.getElementById(`cron-${field}`).value = state[field]);
    render();
  }

  async function copy(text, title) {
    try { await navigator.clipboard.writeText(text); if (window.Swal) Swal.fire({ icon:"success", title, toast:true, position:"top-end", timer:1700, showConfirmButton:false }); }
    catch (_) { const ta=document.createElement("textarea"); ta.value=text; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); }
  }

  function bind() {
    document.querySelectorAll(".cron-tab").forEach((tab) => tab.addEventListener("click", () => {
      state.mode = tab.dataset.mode;
      document.querySelectorAll(".cron-tab").forEach((x) => x.classList.toggle("active", x === tab));
      document.getElementById("cron-preset-panel").hidden = state.mode !== "preset";
      document.getElementById("cron-custom-panel").hidden = state.mode !== "custom";
    }));
    document.querySelectorAll(".cron-preset").forEach((button) => button.addEventListener("click", () => loadPreset(button.dataset.preset)));
    ["minute","hour","dom","month","dow"].forEach((field) => document.getElementById(`cron-${field}`).addEventListener("input", (event) => { state[field] = event.target.value.trim() || "*"; render(); }));
    document.getElementById("cron-command").addEventListener("input", (event) => { state.command = event.target.value; });
    document.getElementById("cron-generate").addEventListener("click", render);
    document.getElementById("cron-copy").addEventListener("click", () => copy(expression(), "Cron expression copied"));
    document.getElementById("cron-copy-line").addEventListener("click", () => copy(`${expression()} ${state.command}`.trim(), "Crontab line copied"));
  }

  function install() {
    addSidebarItem();
    const shell=document.querySelector(".workspace-shell");
    if (!shell || document.getElementById("cron-section")) return;
    shell.appendChild(createSection());
    bind(); patchSwitchMode(); loadPreset("daily9");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once:true }); else install();
})();
