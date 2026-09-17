const parquetState = {
  db: null,
  conn: null,
  initPromise: null,
  tabs: [],
  activeTabId: null,
  maxTabs: 10,
  pageSize: 100,
};

const DUCKDB_MJS = 'https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.29.0/+esm';
const DUCKDB_TIMEOUT = 30000;

function parquetEscapeIdent(value) { return '"' + String(value).replaceAll('"', '""') + '"'; }
function parquetEscapeString(value) { return "'" + String(value).replaceAll("'", "''") + "'"; }
function escapeParquetHtml(value) { return String(value ?? '').replace(/[&<>\'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function formatParquetValue(value) { if (value === null || value === undefined) return 'NULL'; if (typeof value === 'object') return JSON.stringify(value); return String(value); }
function parquetToast(title, icon = 'info') { if (window.Swal) Swal.fire({ title, icon, toast: true, position: 'top-end', timer: 2600, showConfirmButton: false }); }
function activeParquetTab() { return parquetState.tabs.find(tab => tab.id === parquetState.activeTabId) || null; }
function parquetTableName(id) { return `parquet_${String(id).replace(/[^a-zA-Z0-9_]/g, '_')}`; }
function parquetWithTimeout(promise, message) { let timer; const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), DUCKDB_TIMEOUT); }); return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)); }

async function loadDuckDB() {
  if (parquetState.db && parquetState.conn) return parquetState.db;
  if (parquetState.initPromise) return parquetState.initPromise;
  parquetState.initPromise = (async () => {
    const duckdb = await import(DUCKDB_MJS);
    const bundles = duckdb.getJsDelivrBundles();
    const bundle = await duckdb.selectBundle(bundles);
    if (!bundle?.mainWorker || !bundle?.mainModule) throw new Error('DuckDB-WASM bundle could not be selected.');
    const workerUrl = URL.createObjectURL(new Blob([`importScripts(${JSON.stringify(bundle.mainWorker)});`], { type: 'text/javascript' }));
    let worker;
    try {
      worker = new Worker(workerUrl);
      const db = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(), worker);
      await parquetWithTimeout(db.instantiate(bundle.mainModule, bundle.pthreadWorker), 'DuckDB took too long to initialize. Please refresh and try again.');
      const conn = await parquetWithTimeout(db.connect(), 'Could not connect to the local DuckDB engine.');
      parquetState.db = db;
      parquetState.conn = conn;
      return db;
    } catch (error) {
      try { worker?.terminate(); } catch (_) {}
      throw error;
    } finally { URL.revokeObjectURL(workerUrl); }
  })().catch(error => { parquetState.db = null; parquetState.conn = null; throw error; }).finally(() => { parquetState.initPromise = null; });
  return parquetState.initPromise;
}

function installParquetStyles() {
  if (document.getElementById('parquet-runtime-styles')) return;
  const style = document.createElement('style');
  style.id = 'parquet-runtime-styles';
  style.textContent = `
    .data-section-label{margin-top:22px}.parquet-nav-item .feature-icon{background:linear-gradient(135deg,#14b8a6,#0ea5e9);color:#fff}.parquet-nav-item.active{border-color:rgba(14,165,233,.35);background:linear-gradient(90deg,rgba(14,165,233,.13),rgba(20,184,166,.06))}
    .parquet-workspace{min-height:620px}.parquet-heading{align-items:flex-start}.privacy-badge{padding:8px 12px;border:1px solid var(--border-color,#dfe3ea);border-radius:999px;font-size:12px;color:var(--muted-text,#687386);white-space:nowrap}.privacy-badge i{color:#10b981;margin-right:6px}
    .parquet-dropzone{border:1px dashed #9aa6b8;border-radius:18px;background:linear-gradient(145deg,rgba(14,165,233,.055),rgba(20,184,166,.035));padding:48px 24px;text-align:center;transition:.2s;cursor:pointer}.parquet-dropzone:hover,.parquet-dropzone.dragging{border-color:#0ea5e9;transform:translateY(-1px);background:rgba(14,165,233,.08)}.drop-icon{width:54px;height:54px;margin:0 auto 16px;border-radius:15px;display:grid;place-items:center;background:rgba(14,165,233,.12);color:#0ea5e9;font-size:22px}.parquet-dropzone h3{margin:0 0 7px;font-size:20px}.parquet-dropzone p{margin:0;color:var(--muted-text,#687386)}.parquet-dropzone span{display:block;margin-top:14px;font-size:12px;color:#8b95a5}
    .inline-link{border:0;background:none;color:#0284c7;font-weight:700;cursor:pointer;font-size:inherit;padding:0}.parquet-loading{display:flex;align-items:center;gap:14px;padding:18px 20px;border:1px solid var(--border-color,#dfe3ea);border-radius:12px;margin-top:14px}.parquet-loading small{display:block;color:#7b8493;margin-top:3px}.loader{width:18px;height:18px;border:2px solid #d5dce5;border-top-color:#0ea5e9;border-radius:50%;animation:parquet-spin .8s linear infinite}@keyframes parquet-spin{to{transform:rotate(360deg)}}
    .parquet-tabs-bar{display:flex;align-items:center;gap:4px;padding:0 8px;border:1px solid var(--border-color,#dfe3ea);border-bottom:0;border-radius:12px 12px 0 0;background:var(--surface,#fff);overflow-x:auto}.parquet-file-tab{position:relative;display:flex;align-items:center;gap:7px;border:0;background:transparent;padding:10px 12px;color:#7b8493;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;font-size:12px}.parquet-file-tab.active{color:#0f172a;border-bottom-color:#0ea5e9;font-weight:700}.parquet-file-tab .tab-close{border:0;background:none;color:#9aa4b2;padding:2px 3px;cursor:pointer;border-radius:4px}.parquet-file-tab .tab-close:hover{background:rgba(100,116,139,.12);color:#ef4444}.parquet-add-tab{margin-left:auto;border:1px solid #d6dce5;background:#fff;border-radius:7px;width:30px;height:30px;cursor:pointer;flex:0 0 auto}.parquet-add-tab:disabled{opacity:.4;cursor:not-allowed}
    .parquet-tab-hint{font-size:11px;color:#8b95a5;margin:8px 2px 10px}.parquet-app{border:1px solid var(--border-color,#dfe3ea);border-radius:0 14px 14px 14px;overflow:hidden;background:var(--surface,#fff);box-shadow:0 8px 30px rgba(15,23,42,.05)}.parquet-toolbar{display:flex;justify-content:space-between;align-items:center;gap:15px;padding:13px 15px;border-bottom:1px solid var(--border-color,#dfe3ea)}.dataset-identity{display:flex;align-items:center;gap:10px}.dataset-icon{width:34px;height:34px;border-radius:9px;display:grid;place-items:center;background:rgba(14,165,233,.1);color:#0284c7}.dataset-identity strong,.dataset-identity small{display:block}.dataset-identity small{color:#7b8493;margin-top:2px}.parquet-actions{display:flex;gap:8px}.parquet-body{display:grid;grid-template-columns:220px minmax(0,1fr);min-height:480px}.parquet-schema-panel{border-right:1px solid var(--border-color,#dfe3ea);background:rgba(248,250,252,.75)}.schema-header{display:flex;justify-content:space-between;padding:13px 14px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;border-bottom:1px solid var(--border-color,#dfe3ea)}.schema-header span:last-child{font-variant-numeric:tabular-nums}.schema-list{padding:8px}.schema-item{display:flex;align-items:center;gap:8px;padding:8px 9px;border-radius:7px;font-size:12px}.schema-item:hover{background:rgba(14,165,233,.08)}.schema-type{margin-left:auto;color:#8a94a4;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px}.schema-item i{width:14px;text-align:center;color:#0ea5e9}.parquet-main{min-width:0}
    .parquet-querybar{display:flex;align-items:center;gap:8px;padding:10px;border-bottom:1px solid var(--border-color,#dfe3ea);background:rgba(248,250,252,.45)}.query-label{display:flex;align-items:center;gap:7px;color:#687386;font-size:12px;white-space:nowrap}.query-label i{color:#0ea5e9}.parquet-querybar input{flex:1;min-width:80px;height:34px;border:1px solid #d6dce5;border-radius:7px;padding:0 10px;background:var(--surface,#fff);font:12px ui-monospace,SFMono-Regular,Menlo,monospace}.parquet-querybar input:focus{outline:none;border-color:#0ea5e9;box-shadow:0 0 0 3px rgba(14,165,233,.1)}.parquet-subtabs{display:flex;border-bottom:1px solid var(--border-color,#dfe3ea);padding:0 10px}.parquet-subtab{border:0;background:none;padding:10px 12px;color:#7b8493;cursor:pointer;border-bottom:2px solid transparent}.parquet-subtab.active{color:#0f172a;border-bottom-color:#0ea5e9;font-weight:700}.parquet-view{display:none}.parquet-view.active{display:block}.table-wrap{overflow:auto;max-height:450px}.table-wrap table{width:100%;border-collapse:separate;border-spacing:0;font-size:12px;white-space:nowrap}.table-wrap th{position:sticky;top:0;z-index:1;background:#f8fafc;color:#475569;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;padding:9px 11px;border-bottom:1px solid #dfe3ea}.table-wrap td{padding:8px 11px;border-bottom:1px solid #edf0f4;color:#263244;max-width:360px;overflow:hidden;text-overflow:ellipsis}.table-wrap tr:hover td{background:rgba(14,165,233,.045)}.table-status{display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border-top:1px solid var(--border-color,#dfe3ea);font-size:11px;color:#7b8493}.pagination{display:flex;align-items:center;gap:8px}.pagination button{width:28px;height:28px;border:1px solid #d6dce5;background:#fff;border-radius:6px;cursor:pointer}.pagination button:disabled{opacity:.35;cursor:not-allowed}.pagination span{min-width:110px;text-align:center}.parquet-schema-details{padding:18px}.schema-detail-row{display:grid;grid-template-columns:1fr 120px 120px;gap:12px;padding:10px 0;border-bottom:1px solid #edf0f4;font-size:12px}.schema-detail-row.header{font-weight:800;color:#64748b}
    .dark-mode .parquet-dropzone{border-color:#445066;background:rgba(14,165,233,.06)}.dark-mode .parquet-tabs-bar,.dark-mode .parquet-app,.dark-mode .parquet-loading,.dark-mode .tab-rename-popover{background:#151a24;border-color:#30394a}.dark-mode .parquet-schema-panel,.dark-mode .parquet-querybar,.dark-mode .table-wrap th{background:#10151f}.dark-mode .table-wrap td{color:#dbe2ec;border-color:#252d3a}.dark-mode .table-wrap th{color:#aeb8c7;border-color:#30394a}.dark-mode .parquet-file-tab.active,.dark-mode .parquet-subtab.active{color:#e5edf8}.dark-mode .parquet-querybar input,.dark-mode .pagination button,.dark-mode .parquet-add-tab{background:#151a24;color:#dbe2ec;border-color:#3a4558}.dark-mode .parquet-toolbar,.dark-mode .parquet-subtabs,.dark-mode .table-status,.dark-mode .parquet-schema-panel{border-color:#30394a}
    @media(max-width:900px){.parquet-body{grid-template-columns:1fr}.parquet-schema-panel{display:none}.parquet-querybar{flex-wrap:wrap}.query-label{width:100%}.parquet-heading{flex-direction:column}.parquet-toolbar{align-items:flex-start;flex-direction:column}.parquet-actions{width:100%}.parquet-actions button{flex:1}}
  `;
  document.head.appendChild(style);
}

function createParquetUI() {
  installParquetStyles();
  const sidebar = document.querySelector('.feature-group');
  if (sidebar && !document.querySelector('.parquet-nav-item')) {
    const group = sidebar.parentElement;
    const label = document.createElement('div'); label.className = 'sidebar-section-label data-section-label'; label.textContent = 'Data';
    const dataNav = document.createElement('nav'); dataNav.className = 'feature-group';
    dataNav.innerHTML = `<button class="feature-item parquet-nav-item" onclick="switchMode('parquet')"><span class="feature-icon"><i class="fas fa-table-cells-large"></i></span><span class="feature-copy"><strong>Parquet Explorer</strong><small>Up to 10 datasets</small></span><kbd>7</kbd></button>`;
    group.after(label, dataNav);
  }
  const shell = document.querySelector('.workspace-shell');
  if (!shell || document.getElementById('parquet-section')) return;
  const section = document.createElement('section');
  section.id = 'parquet-section'; section.className = 'tool-section parquet-workspace'; section.style.display = 'none';
  section.innerHTML = `
    <div class="section-heading parquet-heading"><div><span class="section-kicker">Data explorer</span><h2>Parquet Explorer</h2><p>Open up to 10 Parquet files as tabs, rename them, inspect schemas, browse rows, filter data, and export CSV — entirely in your browser.</p></div><div class="privacy-badge"><i class="fas fa-lock"></i> Your files stay local</div></div>
    <div id="parquet-dropzone" class="parquet-dropzone" tabindex="0"><input id="parquet-file-input" type="file" accept=".parquet,.parq" multiple hidden><div class="drop-icon"><i class="fas fa-layer-group"></i></div><h3>Drop up to 10 Parquet files here</h3><p>or <button class="inline-link" type="button">browse your files</button></p><span>Multi-file tabs · double-click a tab to rename · Apache Parquet · local processing</span></div>
    <div id="parquet-loading" class="parquet-loading" hidden><span class="loader"></span><div><strong id="parquet-loading-title">Opening Parquet files…</strong><small id="parquet-loading-text">Initializing the local DuckDB engine</small></div></div>
    <div id="parquet-error" class="parquet-loading" hidden><span style="color:#ef4444"><i class="fas fa-circle-exclamation"></i></span><div><strong>Could not open Parquet files</strong><small id="parquet-error-detail"></small></div></div>
    <div id="parquet-empty-state" class="parquet-empty-state"><i class="fas fa-database"></i><strong>No datasets open</strong><span>Add one or more .parquet files to start exploring.</span></div>
    <div id="parquet-tabs-wrap" hidden><div class="parquet-tabs-bar" id="parquet-file-tabs"><button class="parquet-add-tab" id="parquet-add-tab" title="Add Parquet files"><i class="fas fa-plus"></i></button></div><div class="parquet-tab-hint">Double-click a dataset tab to rename it.</div></div>
    <div id="parquet-app" class="parquet-app" hidden><div class="parquet-toolbar"><div class="dataset-identity"><span class="dataset-icon"><i class="fas fa-table"></i></span><div><strong id="parquet-file-name"></strong><small id="parquet-file-meta"></small></div></div><div class="parquet-actions"><button class="secondary-action" id="parquet-open-btn"><i class="fas fa-plus"></i> Add files</button><button class="secondary-action" id="parquet-export-btn"><i class="fas fa-download"></i> Export CSV</button></div></div><div class="parquet-body"><aside class="parquet-schema-panel"><div class="schema-header"><span>Schema</span><span id="parquet-column-count">0</span></div><div id="parquet-schema-list" class="schema-list"></div></aside><div class="parquet-main"><div class="parquet-querybar"><div class="query-label"><i class="fas fa-terminal"></i><span>Quick filter</span></div><input id="parquet-filter" type="text" placeholder="e.g. amount > 1000 or status = 'active'"><button class="primary-action" id="parquet-run-filter"><i class="fas fa-play"></i> Run</button><button class="icon-button" id="parquet-clear-filter"><i class="fas fa-xmark"></i></button></div><div class="parquet-subtabs"><button class="parquet-subtab active" data-view="data">Data</button><button class="parquet-subtab" data-view="schema">Schema details</button></div><div id="parquet-data-view" class="parquet-view active"><div class="table-wrap"><table id="parquet-table"><thead></thead><tbody></tbody></table></div><div class="table-status"><span id="parquet-result-count">0 rows</span><div class="pagination"><button id="parquet-prev"><i class="fas fa-chevron-left"></i></button><span id="parquet-page-label">Page 1</span><button id="parquet-next"><i class="fas fa-chevron-right"></i></button></div></div></div><div id="parquet-schema-view" class="parquet-view"><div class="parquet-schema-details" id="parquet-schema-details"></div></div></div></div></div>`;
  shell.appendChild(section);

  const input = section.querySelector('#parquet-file-input');
  section.querySelector('.inline-link').onclick = () => input.click();
  section.querySelector('#parquet-open-btn').onclick = () => { if (parquetState.tabs.length >= parquetState.maxTabs) return parquetToast('Maximum 10 Parquet tabs are open', 'info'); input.click(); };
  input.onchange = event => { const files = Array.from(event.target.files || []); event.target.value = ''; if (files.length) openParquetFiles(files); };
  const dz = section.querySelector('#parquet-dropzone');
  ['dragenter','dragover'].forEach(eventName => dz.addEventListener(eventName, event => { event.preventDefault(); dz.classList.add('dragging'); }));
  ['dragleave','drop'].forEach(eventName => dz.addEventListener(eventName, event => { event.preventDefault(); dz.classList.remove('dragging'); }));
  dz.addEventListener('drop', event => { const files = Array.from(event.dataTransfer.files || []).filter(file => /\.parq(uet)?$/i.test(file.name)); if (files.length) openParquetFiles(files); else parquetToast('Please drop .parquet files', 'info'); });
  section.querySelector('#parquet-run-filter').onclick = applyParquetFilter;
  section.querySelector('#parquet-clear-filter').onclick = clearParquetFilter;
  section.querySelector('#parquet-prev').onclick = () => changeParquetPage(-1);
  section.querySelector('#parquet-next').onclick = () => changeParquetPage(1);
  section.querySelectorAll('.parquet-subtab').forEach(tab => tab.onclick = () => switchParquetView(tab.dataset.view));
}

function renderParquetTabs() {
  const wrap = document.getElementById('parquet-tabs-wrap');
  const bar = document.getElementById('parquet-file-tabs');
  if (!wrap || !bar) return;
  wrap.hidden = parquetState.tabs.length === 0;
  bar.innerHTML = parquetState.tabs.map(tab => `<button class="parquet-file-tab ${tab.id === parquetState.activeTabId ? 'active' : ''}" data-id="${escapeParquetHtml(tab.id)}" title="${escapeParquetHtml(tab.originalName)}"><i class="fas fa-table"></i><span class="tab-label">${escapeParquetHtml(tab.name)}</span><button class="tab-close" type="button" title="Close"><i class="fas fa-xmark"></i></button></button>`).join('') + `<button class="parquet-add-tab" id="parquet-add-tab" type="button" title="Add Parquet files" ${parquetState.tabs.length >= parquetState.maxTabs ? 'disabled' : ''}><i class="fas fa-plus"></i></button>`;
  bar.querySelectorAll('.parquet-file-tab').forEach(button => {
    const id = button.dataset.id;
    button.onclick = () => activateParquetTab(id);
    button.ondblclick = event => { if (!event.target.closest('.tab-close')) renameParquetTab(id); };
    button.querySelector('.tab-close').onclick = event => { event.stopPropagation(); closeParquetTab(id); };
  });
  bar.querySelector('.parquet-add-tab').onclick = () => document.getElementById('parquet-file-input')?.click();
}

function renderActiveParquetTab() {
  const tab = activeParquetTab();
  const app = document.getElementById('parquet-app');
  const empty = document.getElementById('parquet-empty-state');
  if (!tab) { app.hidden = true; empty.hidden = false; return; }
  app.hidden = false; empty.hidden = true;
  document.getElementById('parquet-file-name').textContent = tab.name;
  document.getElementById('parquet-file-meta').textContent = `${tab.totalRows.toLocaleString()} rows · ${tab.columns.length} columns · ${(tab.size / 1024 / 1024).toFixed(2)} MB`;
  document.getElementById('parquet-column-count').textContent = tab.columns.length;
  document.getElementById('parquet-filter').value = tab.filter || '';
  document.getElementById('parquet-schema-list').innerHTML = tab.columns.map(column => { const icon = /INT|DOUBLE|DECIMAL|FLOAT|BIGINT|SMALLINT|TINYINT|HUGEINT|REAL/i.test(column.type) ? 'hashtag' : /DATE|TIME|TIMESTAMP/i.test(column.type) ? 'calendar' : 'font'; return `<div class="schema-item"><i class="fas fa-${icon}"></i><span>${escapeParquetHtml(column.name)}</span><span class="schema-type">${escapeParquetHtml(column.type)}</span></div>`; }).join('');
  document.getElementById('parquet-schema-details').innerHTML = `<div class="schema-detail-row header"><span>Column</span><span>Type</span><span>Nullable</span></div>` + tab.columns.map(column => `<div class="schema-detail-row"><span>${escapeParquetHtml(column.name)}</span><span>${escapeParquetHtml(column.type)}</span><span>${escapeParquetHtml(column.nullable || 'YES')}</span></div>`).join('');
  renderParquetTabs();
  renderParquetPage();
}

async function openParquetFiles(files) {
  const remaining = Math.max(0, parquetState.maxTabs - parquetState.tabs.length);
  if (!remaining) return parquetToast('Maximum 10 Parquet tabs are already open', 'info');
  const valid = files.filter(file => /\.parq(uet)?$/i.test(file.name)).slice(0, remaining);
  if (!valid.length) return parquetToast('Please choose .parquet files', 'info');
  if (files.length > remaining) parquetToast(`Only ${remaining} more tab${remaining === 1 ? '' : 's'} can be opened`, 'info');

  const loading = document.getElementById('parquet-loading');
  const errorBox = document.getElementById('parquet-error');
  const drop = document.getElementById('parquet-dropzone');
  const empty = document.getElementById('parquet-empty-state');
  loading.hidden = false; errorBox.hidden = true; drop.hidden = true; empty.hidden = true;
  try {
    document.getElementById('parquet-loading-title').textContent = `Opening ${valid.length} file${valid.length === 1 ? '' : 's'}…`;
    document.getElementById('parquet-loading-text').textContent = 'Initializing the local DuckDB engine';
    const db = await loadDuckDB();
    for (let index = 0; index < valid.length; index++) {
      const file = valid[index];
      document.getElementById('parquet-loading-title').textContent = `Opening ${index + 1} of ${valid.length}…`;
      document.getElementById('parquet-loading-text').textContent = file.name;
      const id = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const viewName = parquetTableName(id);
      const path = `/parquet/${id}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const buffer = new Uint8Array(await file.arrayBuffer());
      await parquetWithTimeout(db.registerFileBuffer(path, buffer), `Timed out while loading ${file.name}.`);
      await parquetWithTimeout(parquetState.conn.query(`CREATE OR REPLACE VIEW ${parquetEscapeIdent(viewName)} AS SELECT * FROM read_parquet(${parquetEscapeString(path)})`), `Timed out while reading ${file.name}.`);
      const countResult = await parquetWithTimeout(parquetState.conn.query(`SELECT COUNT(*)::BIGINT AS n FROM ${parquetEscapeIdent(viewName)}`), `Timed out while counting rows in ${file.name}.`);
      const schemaResult = await parquetWithTimeout(parquetState.conn.query(`DESCRIBE ${parquetEscapeIdent(viewName)}`), `Timed out while reading the schema of ${file.name}.`);
      const tab = { id, viewName, originalName: file.name, name: file.name.replace(/\.parq(uet)?$/i, ''), size: file.size, totalRows: Number(countResult.toArray()[0]?.n || 0), columns: schemaResult.toArray().map(row => ({ name: row.column_name, type: row.column_type, nullable: row.null })), page: 0, filter: '', path };
      parquetState.tabs.push(tab);
      parquetState.activeTabId = id;
      renderParquetTabs();
    }
    renderActiveParquetTab();
    parquetToast(`${valid.length} Parquet file${valid.length === 1 ? '' : 's'} opened`, 'success');
  } catch (error) {
    console.error('Parquet Explorer:', error);
    errorBox.hidden = false;
    document.getElementById('parquet-error-detail').textContent = error?.message || String(error);
    drop.hidden = parquetState.tabs.length > 0;
    empty.hidden = parquetState.tabs.length > 0;
    parquetToast('Could not open Parquet file', 'error');
  } finally {
    loading.hidden = true;
    if (parquetState.tabs.length) { drop.hidden = false; empty.hidden = true; }
    renderParquetTabs();
  }
}

async function renderParquetPage() {
  const tab = activeParquetTab();
  if (!tab || !parquetState.conn) return;
  const where = tab.filter ? ` WHERE ${tab.filter}` : '';
  try {
    const totalResult = await parquetWithTimeout(parquetState.conn.query(`SELECT COUNT(*)::BIGINT AS n FROM ${parquetEscapeIdent(tab.viewName)}${where}`), 'The filtered query timed out.');
    const filteredTotal = Number(totalResult.toArray()[0]?.n || 0);
    const offset = tab.page * parquetState.pageSize;
    const result = await parquetWithTimeout(parquetState.conn.query(`SELECT * FROM ${parquetEscapeIdent(tab.viewName)}${where} LIMIT ${parquetState.pageSize} OFFSET ${offset}`), 'The preview query timed out.');
    const rows = result.toArray();
    const names = tab.columns.map(column => column.name);
    document.querySelector('#parquet-table thead').innerHTML = `<tr>${names.map(name => `<th>${escapeParquetHtml(name)}</th>`).join('')}</tr>`;
    document.querySelector('#parquet-table tbody').innerHTML = rows.length ? rows.map(row => `<tr>${names.map(name => { const value = formatParquetValue(row[name]); return `<td title="${escapeParquetHtml(value)}">${escapeParquetHtml(value)}</td>`; }).join('')}</tr>`).join('') : `<tr><td colspan="${Math.max(1, names.length)}" style="text-align:center;padding:45px;color:#7b8493">No rows match this filter.</td></tr>`;
    document.getElementById('parquet-result-count').textContent = `${filteredTotal.toLocaleString()} rows${tab.filter ? ' matching filter' : ''}`;
    document.getElementById('parquet-page-label').textContent = `Page ${tab.page + 1} of ${Math.max(1, Math.ceil(filteredTotal / parquetState.pageSize))}`;
    document.getElementById('parquet-prev').disabled = tab.page === 0;
    document.getElementById('parquet-next').disabled = offset + parquetState.pageSize >= filteredTotal;
  } catch (error) { parquetToast(`Query failed: ${error?.message || error}`, 'error'); }
}

function activateParquetTab(id) { if (parquetState.tabs.some(tab => tab.id === id)) { parquetState.activeTabId = id; renderActiveParquetTab(); } }
function renameParquetTab(id) { const tab = parquetState.tabs.find(item => item.id === id); if (!tab) return; const name = window.prompt('Rename Parquet tab', tab.name); if (name === null) return; const clean = name.trim(); if (!clean) return parquetToast('Tab name cannot be empty', 'info'); tab.name = clean.slice(0, 80); renderParquetTabs(); renderActiveParquetTab(); }
function closeParquetTab(id) { const index = parquetState.tabs.findIndex(tab => tab.id === id); if (index < 0) return; const wasActive = parquetState.activeTabId === id; parquetState.tabs.splice(index, 1); if (wasActive) { const next = parquetState.tabs[index] || parquetState.tabs[index - 1] || parquetState.tabs[0]; parquetState.activeTabId = next?.id || null; } renderParquetTabs(); renderActiveParquetTab(); }
async function applyParquetFilter() { const tab = activeParquetTab(); if (!tab) return; const input = document.getElementById('parquet-filter'); const previous = tab.filter; tab.filter = input.value.trim(); tab.page = 0; try { await renderParquetPage(); } catch (error) { tab.filter = previous; parquetToast(`Invalid filter: ${error?.message || error}`, 'error'); } }
function clearParquetFilter() { const tab = activeParquetTab(); if (!tab) return; tab.filter = ''; tab.page = 0; document.getElementById('parquet-filter').value = ''; renderParquetPage(); }
function changeParquetPage(delta) { const tab = activeParquetTab(); if (!tab) return; tab.page = Math.max(0, tab.page + delta); renderParquetPage(); }
function switchParquetView(view) { document.querySelectorAll('.parquet-subtab').forEach(tab => tab.classList.toggle('active', tab.dataset.view === view)); document.getElementById('parquet-data-view').classList.toggle('active', view === 'data'); document.getElementById('parquet-schema-view').classList.toggle('active', view === 'schema'); }
async function exportParquetCsv() { const tab = activeParquetTab(); if (!tab || !parquetState.conn) return parquetToast('Open a Parquet file first', 'info'); try { const where = tab.filter ? ` WHERE ${tab.filter}` : ''; const exportPath = `/parquet/${tab.id}-export.csv`; await parquetWithTimeout(parquetState.conn.query(`COPY (SELECT * FROM ${parquetEscapeIdent(tab.viewName)}${where}) TO ${parquetEscapeString(exportPath)} (HEADER, DELIMITER ',')`), 'CSV export timed out.'); const csv = await parquetState.db.copyFileToBuffer(exportPath); const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${tab.name.replace(/[^a-zA-Z0-9._-]/g, '_')}.csv`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); parquetToast('CSV exported', 'success'); } catch (error) { parquetToast(`Export failed: ${error?.message || error}`, 'error'); } }

function installParquetMode() {
  createParquetUI();
  const original = window.switchMode;
  window.switchMode = function(mode) {
    if (mode !== 'parquet') return original(mode);
    ['formatter','compare','codegen','convert','mockgen','editor'].forEach(section => { const element = document.getElementById(`${section}-section`); if (element) element.style.display = 'none'; });
    const target = document.getElementById('parquet-section'); if (target) target.style.display = 'block';
    document.querySelectorAll('.feature-item').forEach(item => item.classList.remove('active')); document.querySelector('.parquet-nav-item')?.classList.add('active');
    const title = document.getElementById('page-title'); if (title) title.textContent = 'Parquet Explorer'; document.body.classList.remove('sidebar-open');
  };
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installParquetMode); else installParquetMode();
