const parquetState = {
  db: null,
  conn: null,
  fileName: '',
  tableName: 'dataset',
  page: 0,
  pageSize: 100,
  totalRows: 0,
  columns: [],
  filter: '',
};

const DUCKDB_MJS = 'https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.29.0/+esm';

function parquetEscapeIdent(value) { return '"' + String(value).replaceAll('"', '""') + '"'; }
function parquetEscapeString(value) { return "'" + String(value).replaceAll("'", "''") + "'"; }

async function loadDuckDB() {
  if (parquetState.db) return parquetState.db;

  const duckdb = await import(DUCKDB_MJS);
  const bundles = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(bundles);

  // Web Workers must be same-origin. DuckDB's CDN worker is loaded through
  // a same-origin Blob worker, which is the deployment pattern recommended
  // by DuckDB-Wasm for CDN usage (and works on GitHub Pages).
  const workerUrl = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' })
  );

  try {
    const worker = new Worker(workerUrl);
    const logger = new duckdb.ConsoleLogger();
    const db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

    parquetState.db = db;
    parquetState.conn = await db.connect();
    return db;
  } finally {
    URL.revokeObjectURL(workerUrl);
  }
}

function installParquetStyles() {
  if (document.getElementById('parquet-runtime-styles')) return;
  const style = document.createElement('style');
  style.id = 'parquet-runtime-styles';
  style.textContent = `
    .data-section-label{margin-top:22px}.parquet-nav-item .feature-icon{background:linear-gradient(135deg,#14b8a6,#0ea5e9);color:#fff}.parquet-nav-item.active{border-color:rgba(14,165,233,.35);background:linear-gradient(90deg,rgba(14,165,233,.13),rgba(20,184,166,.06))}
    .parquet-workspace{min-height:620px}.parquet-heading{align-items:flex-start}.privacy-badge{padding:8px 12px;border:1px solid var(--border-color,#dfe3ea);border-radius:999px;font-size:12px;color:var(--muted-text,#687386);white-space:nowrap}.privacy-badge i{color:#10b981;margin-right:6px}
    .parquet-dropzone{border:1px dashed #9aa6b8;border-radius:18px;background:linear-gradient(145deg,rgba(14,165,233,.055),rgba(20,184,166,.035));padding:56px 24px;text-align:center;transition:.2s;cursor:pointer}.parquet-dropzone:hover,.parquet-dropzone.dragging{border-color:#0ea5e9;transform:translateY(-1px);background:rgba(14,165,233,.08)}.drop-icon{width:54px;height:54px;margin:0 auto 16px;border-radius:15px;display:grid;place-items:center;background:rgba(14,165,233,.12);color:#0ea5e9;font-size:22px}.parquet-dropzone h3{margin:0 0 7px;font-size:20px}.parquet-dropzone p{margin:0;color:var(--muted-text,#687386)}.parquet-dropzone span{display:block;margin-top:14px;font-size:12px;color:#8b95a5}.inline-link{border:0;background:none;color:#0284c7;font-weight:700;cursor:pointer;font-size:inherit;padding:0}.parquet-empty-state{text-align:center;padding:70px 20px;color:#7b8493}.parquet-empty-state i{display:block;font-size:28px;margin-bottom:12px;opacity:.55}.parquet-empty-state strong,.parquet-empty-state span{display:block}.parquet-empty-state span{font-size:13px;margin-top:6px}.parquet-loading{display:flex;align-items:center;gap:14px;padding:18px 20px;border:1px solid var(--border-color,#dfe3ea);border-radius:12px;margin-top:14px}.parquet-loading small{display:block;color:#7b8493;margin-top:3px}.loader{width:18px;height:18px;border:2px solid #d5dce5;border-top-color:#0ea5e9;border-radius:50%;animation:parquet-spin .8s linear infinite}@keyframes parquet-spin{to{transform:rotate(360deg)}}
    .parquet-app{border:1px solid var(--border-color,#dfe3ea);border-radius:14px;overflow:hidden;background:var(--surface,#fff);box-shadow:0 8px 30px rgba(15,23,42,.05)}.parquet-toolbar{display:flex;justify-content:space-between;align-items:center;gap:15px;padding:13px 15px;border-bottom:1px solid var(--border-color,#dfe3ea)}.dataset-identity{display:flex;align-items:center;gap:10px}.dataset-icon{width:34px;height:34px;border-radius:9px;display:grid;place-items:center;background:rgba(14,165,233,.1);color:#0284c7}.dataset-identity strong,.dataset-identity small{display:block}.dataset-identity small{color:#7b8493;margin-top:2px}.parquet-actions{display:flex;gap:8px}.parquet-body{display:grid;grid-template-columns:220px minmax(0,1fr);min-height:480px}.parquet-schema-panel{border-right:1px solid var(--border-color,#dfe3ea);background:rgba(248,250,252,.75)}.schema-header{display:flex;justify-content:space-between;padding:13px 14px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;border-bottom:1px solid var(--border-color,#dfe3ea)}.schema-header span:last-child{font-variant-numeric:tabular-nums}.schema-list{padding:8px}.schema-item{display:flex;align-items:center;gap:8px;padding:8px 9px;border-radius:7px;font-size:12px}.schema-item:hover{background:rgba(14,165,233,.08)}.schema-type{margin-left:auto;color:#8a94a4;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:10px}.schema-item i{width:14px;text-align:center;color:#0ea5e9}.parquet-main{min-width:0}.parquet-querybar{display:flex;align-items:center;gap:8px;padding:10px;border-bottom:1px solid var(--border-color,#dfe3ea);background:rgba(248,250,252,.45)}.query-label{display:flex;align-items:center;gap:7px;color:#687386;font-size:12px;white-space:nowrap}.query-label i{color:#0ea5e9}.parquet-querybar input{flex:1;min-width:80px;height:34px;border:1px solid #d6dce5;border-radius:7px;padding:0 10px;background:var(--surface,#fff);font:12px ui-monospace,SFMono-Regular,Menlo,monospace}.parquet-querybar input:focus{outline:none;border-color:#0ea5e9;box-shadow:0 0 0 3px rgba(14,165,233,.1)}.parquet-tabs{display:flex;border-bottom:1px solid var(--border-color,#dfe3ea);padding:0 10px}.parquet-tab{border:0;background:none;padding:10px 12px;color:#7b8493;cursor:pointer;border-bottom:2px solid transparent}.parquet-tab.active{color:#0f172a;border-bottom-color:#0ea5e9;font-weight:700}.parquet-view{display:none}.parquet-view.active{display:block}.table-wrap{overflow:auto;max-height:450px}.table-wrap table{width:100%;border-collapse:separate;border-spacing:0;font-size:12px;white-space:nowrap}.table-wrap th{position:sticky;top:0;z-index:1;background:#f8fafc;color:#475569;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;padding:9px 11px;border-bottom:1px solid #dfe3ea}.table-wrap td{padding:8px 11px;border-bottom:1px solid #edf0f4;color:#263244;max-width:360px;overflow:hidden;text-overflow:ellipsis}.table-wrap tr:hover td{background:rgba(14,165,233,.045)}.table-status{display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border-top:1px solid var(--border-color,#dfe3ea);font-size:11px;color:#7b8493}.pagination{display:flex;align-items:center;gap:8px}.pagination button{width:28px;height:28px;border:1px solid #d6dce5;background:#fff;border-radius:6px;cursor:pointer}.pagination button:disabled{opacity:.35;cursor:not-allowed}.pagination span{min-width:70px;text-align:center}.parquet-schema-details{padding:18px}.schema-detail-row{display:grid;grid-template-columns:1fr 120px 120px;gap:12px;padding:10px 0;border-bottom:1px solid #edf0f4;font-size:12px}.schema-detail-row.header{font-weight:800;color:#64748b}.dark-mode .parquet-dropzone{border-color:#445066;background:rgba(14,165,233,.06)}.dark-mode .parquet-app,.dark-mode .parquet-loading{background:#151a24;border-color:#30394a}.dark-mode .parquet-schema-panel,.dark-mode .parquet-querybar,.dark-mode .table-wrap th{background:#10151f}.dark-mode .table-wrap td{color:#dbe2ec;border-color:#252d3a}.dark-mode .table-wrap th{color:#aeb8c7;border-color:#30394a}.dark-mode .parquet-tab.active{color:#e5edf8}.dark-mode .parquet-querybar input,.dark-mode .pagination button{background:#151a24;color:#dbe2ec;border-color:#3a4558}.dark-mode .parquet-toolbar,.dark-mode .parquet-tabs,.dark-mode .table-status,.dark-mode .parquet-schema-panel{border-color:#30394a}.dark-mode .schema-item:hover{background:rgba(14,165,233,.12)}
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
    dataNav.innerHTML = `<button class="feature-item parquet-nav-item" onclick="switchMode('parquet')"><span class="feature-icon"><i class="fas fa-table-cells-large"></i></span><span class="feature-copy"><strong>Parquet Explorer</strong><small>Browse, filter & export</small></span><kbd>7</kbd></button>`;
    group.after(label, dataNav);
  }
  const shell = document.querySelector('.workspace-shell');
  if (!shell || document.getElementById('parquet-section')) return;
  const section = document.createElement('section');
  section.id = 'parquet-section'; section.className = 'tool-section parquet-workspace'; section.style.display = 'none';
  section.innerHTML = `
    <div class="section-heading parquet-heading"><div><span class="section-kicker">Data explorer</span><h2>Parquet Explorer</h2><p>Drop a Parquet file, inspect its schema, browse rows, filter data, and export a CSV — entirely in your browser.</p></div><div class="privacy-badge"><i class="fas fa-lock"></i> Your file stays local</div></div>
    <div id="parquet-dropzone" class="parquet-dropzone" tabindex="0"><input id="parquet-file-input" type="file" accept=".parquet,.parq" hidden><div class="drop-icon"><i class="fas fa-cloud-arrow-up"></i></div><h3>Drop a Parquet file here</h3><p>or <button class="inline-link" type="button">browse your files</button></p><span>Apache Parquet · local processing · no upload</span></div>
    <div id="parquet-loading" class="parquet-loading" hidden><span class="loader"></span><div><strong>Opening Parquet file…</strong><small>Initializing the local DuckDB engine</small></div></div>
    <div id="parquet-empty-state" class="parquet-empty-state"><i class="fas fa-database"></i><strong>No dataset open</strong><span>Upload a .parquet file to start exploring.</span></div>
    <div id="parquet-app" class="parquet-app" hidden><div class="parquet-toolbar"><div class="dataset-identity"><span class="dataset-icon"><i class="fas fa-table"></i></span><div><strong id="parquet-file-name"></strong><small id="parquet-file-meta"></small></div></div><div class="parquet-actions"><button class="secondary-action" id="parquet-open-btn"><i class="fas fa-plus"></i> Open</button><button class="secondary-action" id="parquet-export-btn"><i class="fas fa-download"></i> Export CSV</button></div></div><div class="parquet-body"><aside class="parquet-schema-panel"><div class="schema-header"><span>Schema</span><span id="parquet-column-count">0</span></div><div id="parquet-schema-list" class="schema-list"></div></aside><div class="parquet-main"><div class="parquet-querybar"><div class="query-label"><i class="fas fa-terminal"></i><span>Quick filter</span></div><input id="parquet-filter" type="text" placeholder="e.g. amount > 1000 or status = 'active'"><button class="primary-action" id="parquet-run-filter"><i class="fas fa-play"></i> Run</button><button class="icon-button" id="parquet-clear-filter"><i class="fas fa-xmark"></i></button></div><div class="parquet-tabs"><button class="parquet-tab active" data-view="data">Data</button><button class="parquet-tab" data-view="schema">Schema details</button></div><div id="parquet-data-view" class="parquet-view active"><div class="table-wrap"><table id="parquet-table"><thead></thead><tbody></tbody></table></div><div class="table-status"><span id="parquet-result-count">0 rows</span><div class="pagination"><button id="parquet-prev"><i class="fas fa-chevron-left"></i></button><span id="parquet-page-label">Page 1</span><button id="parquet-next"><i class="fas fa-chevron-right"></i></button></div></div></div><div id="parquet-schema-view" class="parquet-view"><div class="parquet-schema-details" id="parquet-schema-details"></div></div></div></div></div>`;
  shell.appendChild(section);
  const input = section.querySelector('#parquet-file-input');
  section.querySelector('.inline-link').onclick = () => input.click();
  section.querySelector('#parquet-open-btn').onclick = () => input.click();
  section.querySelector('#parquet-export-btn').onclick = exportParquetCsv;
  input.onchange = e => e.target.files[0] && openParquetFile(e.target.files[0]);
  const dz = section.querySelector('#parquet-dropzone');
  ['dragenter','dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('dragging'); }));
  ['dragleave','drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('dragging'); }));
  dz.addEventListener('drop', e => { const f=e.dataTransfer.files[0]; if(f) openParquetFile(f); });
  section.querySelector('#parquet-run-filter').onclick = applyParquetFilter;
  section.querySelector('#parquet-clear-filter').onclick = clearParquetFilter;
  section.querySelector('#parquet-prev').onclick = () => changeParquetPage(-1);
  section.querySelector('#parquet-next').onclick = () => changeParquetPage(1);
  section.querySelectorAll('.parquet-tab').forEach(tab => tab.onclick = () => switchParquetView(tab.dataset.view));
}

async function openParquetFile(file) {
  if (!/\.parquet$|\.parq$/i.test(file.name)) return parquetToast('Please choose a .parquet file', 'error');
  const loading=document.getElementById('parquet-loading'); const drop=document.getElementById('parquet-dropzone'); const empty=document.getElementById('parquet-empty-state');
  loading.hidden=false; drop.hidden=true; empty.hidden=true;
  try {
    const db=await loadDuckDB();
    const buffer=new Uint8Array(await file.arrayBuffer());
    const path=`/tmp/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
    await db.registerFileBuffer(path, buffer);
    parquetState.fileName=file.name; parquetState.tableName='dataset'; parquetState.page=0; parquetState.filter='';
    await parquetState.conn.query(`CREATE OR REPLACE VIEW dataset AS SELECT * FROM read_parquet(${parquetEscapeString(path)})`);
    const count=await parquetState.conn.query('SELECT COUNT(*)::BIGINT AS n FROM dataset');
    parquetState.totalRows=Number(count.toArray()[0].n);
    const schema=await parquetState.conn.query('DESCRIBE dataset');
    parquetState.columns=schema.toArray().map(r=>({name:r.column_name,type:r.column_type,nullable:r.null}));
    renderParquetMeta(); await renderParquetPage(); parquetToast('Parquet file opened','success');
  } catch(err) { console.error(err); drop.hidden=false; empty.hidden=false; parquetToast(`Could not open file: ${err.message || err}`,'error'); }
  finally { loading.hidden=true; }
}

function renderParquetMeta() {
  document.getElementById('parquet-app').hidden=false; document.getElementById('parquet-file-name').textContent=parquetState.fileName; document.getElementById('parquet-file-meta').textContent=`${parquetState.totalRows.toLocaleString()} rows · ${parquetState.columns.length} columns`; document.getElementById('parquet-column-count').textContent=parquetState.columns.length;
  document.getElementById('parquet-schema-list').innerHTML=parquetState.columns.map(c=>`<div class="schema-item"><i class="fas fa-${/INT|DOUBLE|DECIMAL|FLOAT|BIGINT|SMALLINT|TINYINT/i.test(c.type)?'hashtag':/DATE|TIME|TIMESTAMP/i.test(c.type)?'calendar':'font'}"></i><span>${escapeParquetHtml(c.name)}</span><span class="schema-type">${escapeParquetHtml(c.type)}</span></div>`).join('');
  document.getElementById('parquet-schema-details').innerHTML=`<div class="schema-detail-row header"><span>Column</span><span>Type</span><span>Nullable</span></div>`+parquetState.columns.map(c=>`<div class="schema-detail-row"><span>${escapeParquetHtml(c.name)}</span><span>${escapeParquetHtml(c.type)}</span><span>${escapeParquetHtml(c.nullable||'YES')}</span></div>`).join('');
}

async function renderParquetPage() {
  const where=parquetState.filter?` WHERE ${parquetState.filter}`:''; const total=await parquetState.conn.query(`SELECT COUNT(*)::BIGINT AS n FROM dataset${where}`); const filteredTotal=Number(total.toArray()[0].n); const offset=parquetState.page*parquetState.pageSize;
  const result=await parquetState.conn.query(`SELECT * FROM dataset${where} LIMIT ${parquetState.pageSize} OFFSET ${offset}`); const rows=result.toArray();
  const names=parquetState.columns.map(c=>c.name); document.querySelector('#parquet-table thead').innerHTML=`<tr>${names.map(n=>`<th>${escapeParquetHtml(n)}</th>`).join('')}</tr>`; document.querySelector('#parquet-table tbody').innerHTML=rows.length?rows.map(r=>`<tr>${names.map(n=>`<td title="${escapeParquetHtml(formatParquetValue(r[n]))}">${escapeParquetHtml(formatParquetValue(r[n]))}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${names.length}" style="text-align:center;padding:45px;color:#7b8493">No rows match this filter.</td></tr>`;
  document.getElementById('parquet-result-count').textContent=`${filteredTotal.toLocaleString()} rows${parquetState.filter?' matching filter':''}`; document.getElementById('parquet-page-label').textContent=`Page ${parquetState.page+1} of ${Math.max(1,Math.ceil(filteredTotal/parquetState.pageSize))}`; document.getElementById('parquet-prev').disabled=parquetState.page===0; document.getElementById('parquet-next').disabled=offset+parquetState.pageSize>=filteredTotal;
}

async function applyParquetFilter() { const input=document.getElementById('parquet-filter'); parquetState.filter=input.value.trim(); parquetState.page=0; try { await renderParquetPage(); } catch(err) { parquetToast(`Invalid filter: ${err.message || err}`,'error'); } }
function clearParquetFilter(){ document.getElementById('parquet-filter').value=''; parquetState.filter=''; parquetState.page=0; renderParquetPage(); }
function changeParquetPage(delta){ parquetState.page=Math.max(0,parquetState.page+delta); renderParquetPage(); }
function switchParquetView(view){ document.querySelectorAll('.parquet-tab').forEach(t=>t.classList.toggle('active',t.dataset.view===view)); document.getElementById('parquet-data-view').classList.toggle('active',view==='data'); document.getElementById('parquet-schema-view').classList.toggle('active',view==='schema'); }
async function exportParquetCsv(){ if(!parquetState.conn) return parquetToast('Open a Parquet file first','info'); try { const where=parquetState.filter?` WHERE ${parquetState.filter}`:''; const result=await parquetState.conn.query(`COPY (SELECT * FROM dataset${where}) TO '/tmp/jsonp-export.csv' (HEADER, DELIMITER ',')`); const csv=await parquetState.db.copyFileToBuffer('/tmp/jsonp-export.csv'); const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=parquetState.fileName.replace(/\.parquet?$/i,'')+'.csv'; a.click(); URL.revokeObjectURL(a.href); parquetToast('CSV exported','success'); } catch(err){ parquetToast(`Export failed: ${err.message || err}`,'error'); } }
function formatParquetValue(v){ if(v===null||v===undefined)return 'NULL'; if(typeof v==='object')return JSON.stringify(v); return String(v); }
function escapeParquetHtml(v){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function parquetToast(title,icon){ if(window.Swal) Swal.fire({title,icon,toast:true,position:'top-end',timer:2200,showConfirmButton:false}); }

function installParquetMode() {
  createParquetUI();
  const original = window.switchMode;
  window.switchMode = function(mode) {
    if(mode !== 'parquet') return original(mode);
    ['formatter','compare','codegen','convert','mockgen','editor'].forEach(s=>{const el=document.getElementById(`${s}-section`);if(el)el.style.display='none';});
    const target=document.getElementById('parquet-section'); if(target) target.style.display='block';
    document.querySelectorAll('.feature-item').forEach(i=>i.classList.remove('active')); document.querySelector('.parquet-nav-item')?.classList.add('active');
    document.getElementById('page-title').textContent='Parquet Explorer'; document.body.classList.remove('sidebar-open');
  };
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',installParquetMode); else installParquetMode();