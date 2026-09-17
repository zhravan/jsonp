(() => {
  const UUID_MODES = ["nil", "v1", "v3", "v4", "v5"];
  const NAMESPACE_PRESETS = {
    DNS: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    URL: "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
    OID: "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
    X500: "6ba7b814-9dad-11d1-80b4-00c04fd430c8",
  };

  const state = {
    version: "v4",
    quantity: 1,
    namespace: "DNS",
    customNamespace: "",
    name: "example.com",
    output: [],
    v1LastTimestamp: 0n,
    v1ClockSequence: null,
    v1Node: null,
  };

  const style = document.createElement("style");
  style.textContent = `
    .uuid-generator-card { display:grid; gap:18px; padding:20px; border:1px solid var(--border); border-radius:16px; background:var(--surface); box-shadow:var(--shadow-sm); }
    .uuid-hero { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; }
    .uuid-hero-copy h3 { margin:4px 0 4px; font-size:20px; letter-spacing:-.04em; }
    .uuid-hero-copy p { margin:0; max-width:760px; color:var(--muted); font-size:11px; }
    .uuid-icon { display:grid; place-items:center; width:42px; height:42px; flex:0 0 auto; border:1px solid rgba(99,91,255,.2); border-radius:12px; background:var(--accent-soft); color:var(--accent); font-size:17px; }
    .uuid-controls { display:grid; grid-template-columns:minmax(0,1.25fr) minmax(150px,.7fr); gap:12px; }
    .uuid-control { padding:12px; border:1px solid var(--border); border-radius:12px; background:var(--surface-2); }
    .uuid-label { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; color:var(--muted); font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; }
    .uuid-version-row { display:flex; flex-wrap:wrap; gap:5px; }
    .uuid-version { min-width:48px; padding:8px 11px; border:1px solid var(--border); border-radius:8px; background:var(--surface); color:var(--muted); cursor:pointer; font:700 11px Inter,sans-serif; transition:.16s ease; }
    .uuid-version:hover { border-color:var(--border-strong); color:var(--text); transform:translateY(-1px); }
    .uuid-version.active { border-color:rgba(99,91,255,.35); background:var(--accent-soft); color:var(--accent); box-shadow:0 0 0 2px rgba(99,91,255,.06); }
    .uuid-quantity { display:grid; grid-template-columns:38px 1fr 38px; align-items:center; overflow:hidden; border:1px solid var(--border); border-radius:9px; background:var(--surface); }
    .uuid-stepper { height:36px; background:transparent; color:var(--muted); cursor:pointer; font-size:16px; }
    .uuid-stepper:hover { background:var(--surface-3); color:var(--text); }
    .uuid-quantity input { width:100%; min-height:36px; padding:7px; border:0; border-left:1px solid var(--border); border-right:1px solid var(--border); border-radius:0; background:transparent; text-align:center; font:600 12px 'DM Mono',monospace; box-shadow:none; }
    .uuid-quantity input:focus { box-shadow:none; }
    .uuid-advanced { display:grid; grid-template-columns:180px minmax(0,1fr); gap:10px; }
    .uuid-field { display:flex; flex-direction:column; gap:6px; color:var(--muted); font-size:10px; font-weight:700; }
    .uuid-field input, .uuid-field select { width:100%; }
    .uuid-output-head { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px; }
    .uuid-output-head span { color:var(--muted); font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.07em; }
    .uuid-count { color:var(--muted-2) !important; text-transform:none !important; letter-spacing:0 !important; font-weight:500 !important; }
    .uuid-output { min-height:120px; margin:0; padding:15px; border:1px solid #252b38; border-radius:10px; background:#10141c; color:#d9e0ec; resize:vertical; font:12px/1.8 'DM Mono',monospace; }
    .uuid-output:focus { border-color:rgba(99,91,255,.65); box-shadow:0 0 0 3px rgba(99,91,255,.1); }
    .uuid-actions { display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; }
    .uuid-actions-left, .uuid-actions-right { display:flex; gap:7px; flex-wrap:wrap; }
    .uuid-hint { color:var(--muted-2); font-size:10px; }
    @media (max-width:760px) { .uuid-controls, .uuid-advanced { grid-template-columns:1fr; } .uuid-hero { flex-direction:column; } }
    body.dark-mode .uuid-control { background:rgba(255,255,255,.025); }
    body.dark-mode .uuid-version.active { background:rgba(99,91,255,.15); }
  `;
  document.head.appendChild(style);

  function uuidSection() {
    const section = document.createElement("section");
    section.id = "uuid-section";
    section.className = "tool-section";
    section.style.display = "none";
    section.innerHTML = `
      <div class="section-heading">
        <div>
          <span class="section-kicker">Generate identifiers</span>
          <h2>UUID Generator</h2>
          <p>Create standards-based UUIDs locally in your browser. Generate one or many at once.</p>
        </div>
      </div>
      <div class="uuid-generator-card">
        <div class="uuid-hero">
          <div class="uuid-hero-copy">
            <span class="section-kicker">128-bit identifiers</span>
            <h3>Generate UUIDs instantly</h3>
            <p>Supports NIL, v1, v3, v4 and v5. Nothing is sent to a server.</p>
          </div>
          <div class="uuid-icon"><i class="fas fa-fingerprint"></i></div>
        </div>

        <div class="uuid-controls">
          <div class="uuid-control">
            <div class="uuid-label"><span>UUID version</span><span id="uuid-version-description">Random</span></div>
            <div class="uuid-version-row" role="tablist" aria-label="UUID version">
              <button type="button" class="uuid-version" data-version="nil">NIL</button>
              <button type="button" class="uuid-version" data-version="v1">v1</button>
              <button type="button" class="uuid-version" data-version="v3">v3</button>
              <button type="button" class="uuid-version active" data-version="v4">v4</button>
              <button type="button" class="uuid-version" data-version="v5">v5</button>
            </div>
          </div>
          <div class="uuid-control">
            <div class="uuid-label"><span>Quantity</span><span>1–100</span></div>
            <div class="uuid-quantity">
              <button type="button" class="uuid-stepper" id="uuid-minus" aria-label="Decrease quantity">−</button>
              <input id="uuid-quantity" type="number" min="1" max="100" value="1" aria-label="UUID quantity" />
              <button type="button" class="uuid-stepper" id="uuid-plus" aria-label="Increase quantity">+</button>
            </div>
          </div>
        </div>

        <div id="uuid-namespace-fields" class="uuid-advanced" hidden>
          <label class="uuid-field"><span>Namespace</span><select id="uuid-namespace">
            <option value="DNS">DNS — 6ba7b810…</option>
            <option value="URL">URL — 6ba7b811…</option>
            <option value="OID">OID — 6ba7b812…</option>
            <option value="X500">X.500 — 6ba7b814…</option>
            <option value="CUSTOM">Custom namespace</option>
          </select></label>
          <label class="uuid-field"><span>Name</span><input id="uuid-name" type="text" value="example.com" placeholder="e.g. example.com" /></label>
        </div>
        <div id="uuid-custom-namespace-field" class="uuid-advanced" hidden>
          <label class="uuid-field"><span>Custom namespace UUID</span><input id="uuid-custom-namespace" type="text" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" /></label>
          <div></div>
        </div>

        <div>
          <div class="uuid-output-head"><span>Generated UUIDs</span><span id="uuid-count" class="uuid-count">1 UUID</span></div>
          <textarea id="uuid-output" class="uuid-output" readonly spellcheck="false" aria-label="Generated UUIDs"></textarea>
        </div>

        <div class="uuid-actions">
          <span class="uuid-hint"><i class="fas fa-lock"></i> Generated locally · no data leaves your browser</span>
          <div class="uuid-actions-right">
            <button type="button" id="uuid-copy" class="secondary-action"><i class="fas fa-copy"></i> Copy</button>
            <button type="button" id="uuid-refresh" class="primary-action"><i class="fas fa-rotate"></i> Generate</button>
          </div>
        </div>
      </div>
    `;
    return section;
  }

  function addSidebarItem() {
    const group = document.querySelector(".feature-group");
    if (!group || document.querySelector('.feature-item[onclick*="uuid"]')) return;
    const button = document.createElement("button");
    button.className = "feature-item";
    button.setAttribute("onclick", "switchMode('uuid')");
    button.innerHTML = '<span class="feature-icon"><i class="fas fa-fingerprint"></i></span><span class="feature-copy"><strong>UUID Generator</strong><small>Create v1–v5 identifiers</small></span><kbd>7</kbd>';
    const editor = group.querySelector('.feature-item[onclick*="editor"]');
    if (editor) group.insertBefore(button, editor);
    else group.appendChild(button);
  }

  function install() {
    addSidebarItem();
    const shell = document.querySelector(".workspace-shell");
    if (!shell || document.getElementById("uuid-section")) return;
    shell.appendChild(uuidSection());
    bindEvents();
    patchSwitchMode();
    generate();
  }

  function patchSwitchMode() {
    if (window.__uuidSwitchModePatched || typeof window.switchMode !== "function") return;
    const original = window.switchMode;
    window.switchMode = function (mode) {
      const uuid = document.getElementById("uuid-section");
      if (uuid) uuid.style.display = "none";
      original(mode);
      if (mode === "uuid") {
        if (uuid) uuid.style.display = "block";
        document.querySelectorAll(".feature-item").forEach((item) => item.classList.remove("active"));
        document.querySelector('.feature-item[onclick*="uuid"]')?.classList.add("active");
        const title = document.getElementById("page-title");
        if (title) title.textContent = "UUID Generator";
        document.body.classList.remove("sidebar-open");
      }
    };
    window.__uuidSwitchModePatched = true;
  }

  function clampQuantity(value) {
    return Math.min(100, Math.max(1, Number.parseInt(value, 10) || 1));
  }

  function cleanUuid(value) {
    return String(value).trim().toLowerCase().replace(/[{}]/g, "");
  }

  function parseUuidBytes(value) {
    const normalized = cleanUuid(value);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(normalized)) {
      throw new Error("Invalid namespace UUID");
    }
    return Uint8Array.from(normalized.replaceAll("-", "").match(/.{2}/g).map((byte) => Number.parseInt(byte, 16)));
  }

  function bytesToUuid(bytes, version) {
    const b = new Uint8Array(bytes);
    b[6] = (b[6] & 0x0f) | (version << 4);
    b[8] = (b[8] & 0x3f) | 0x80;
    const hex = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  function randomBytes(length) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return bytes;
  }

  function uuidV4() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return bytesToUuid(randomBytes(16), 4);
  }

  function uuidV1() {
    const UUID_EPOCH = 12219292800000n;
    const now = BigInt(Date.now());
    let timestamp = (now + UUID_EPOCH) * 10000n;
    if (timestamp <= state.v1LastTimestamp) timestamp = state.v1LastTimestamp + 1n;
    state.v1LastTimestamp = timestamp;
    if (state.v1ClockSequence === null) state.v1ClockSequence = (crypto.getRandomValues(new Uint16Array(1))[0] & 0x3fff);
    if (!state.v1Node) {
      state.v1Node = randomBytes(6);
      state.v1Node[0] |= 0x01;
    }

    const timeLow = Number(timestamp & 0xffffffffn) >>> 0;
    const timeMid = Number((timestamp >> 32n) & 0xffffn);
    const timeHi = Number((timestamp >> 48n) & 0x0fffn) | 0x1000;
    const clockSeqHi = ((state.v1ClockSequence >> 8) & 0x3f) | 0x80;
    const clockSeqLow = state.v1ClockSequence & 0xff;
    const node = Array.from(state.v1Node, (x) => x.toString(16).padStart(2, "0")).join("");
    return `${timeLow.toString(16).padStart(8, "0")}-${timeMid.toString(16).padStart(4, "0")}-${timeHi.toString(16).padStart(4, "0")}-${clockSeqHi.toString(16).padStart(2, "0")}${clockSeqLow.toString(16).padStart(2, "0")}-${node}`;
  }

  function add32(a, b) { return (a + b) >>> 0; }

  function leftRotate(x, n) { return (x << n) | (x >>> (32 - n)); }

  function md5(bytes) {
    const originalLength = bytes.length;
    const bitLength = originalLength * 8;
    const paddedLength = ((originalLength + 9 + 63) >> 6) << 6;
    const data = new Uint8Array(paddedLength);
    data.set(bytes);
    data[originalLength] = 0x80;
    const view = new DataView(data.buffer);
    view.setUint32(paddedLength - 8, bitLength >>> 0, true);
    view.setUint32(paddedLength - 4, Math.floor(bitLength / 0x100000000), true);

    let a0 = 0x67452301;
    let b0 = 0xefcdab89;
    let c0 = 0x98badcfe;
    let d0 = 0x10325476;
    const s = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
    const k = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0);

    for (let offset = 0; offset < paddedLength; offset += 64) {
      const m = new Uint32Array(16);
      for (let i = 0; i < 16; i++) m[i] = view.getUint32(offset + i * 4, true);
      let a = a0, b = b0, c = c0, d = d0;
      for (let i = 0; i < 64; i++) {
        let f, g;
        if (i < 16) { f = (b & c) | (~b & d); g = i; }
        else if (i < 32) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16; }
        else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) % 16; }
        else { f = c ^ (b | ~d); g = (7 * i) % 16; }
        const next = d;
        const sum = add32(add32(add32(a, f), k[i]), m[g]);
        d = c;
        c = b;
        b = add32(b, leftRotate(sum, s[i]));
        a = next;
      }
      a0 = add32(a0, a); b0 = add32(b0, b); c0 = add32(c0, c); d0 = add32(d0, d);
    }

    const out = new Uint8Array(16);
    const result = new DataView(out.buffer);
    result.setUint32(0, a0, true); result.setUint32(4, b0, true); result.setUint32(8, c0, true); result.setUint32(12, d0, true);
    return out;
  }

  async function hashName(namespace, name, algorithm) {
    const encoder = new TextEncoder();
    const ns = parseUuidBytes(namespace);
    const nameBytes = encoder.encode(name);
    const data = new Uint8Array(ns.length + nameBytes.length);
    data.set(ns); data.set(nameBytes, ns.length);
    return algorithm === "MD5" ? md5(data) : new Uint8Array(await crypto.subtle.digest("SHA-1", data));
  }

  async function uuidNamed(version, namespace, name) {
    const digest = await hashName(namespace, name, version === "v3" ? "MD5" : "SHA-1");
    return bytesToUuid(digest.slice(0, 16), version === "v3" ? 3 : 5);
  }

  function namespaceValue() {
    if (state.namespace === "CUSTOM") return state.customNamespace;
    return NAMESPACE_PRESETS[state.namespace];
  }

  async function generateOne() {
    if (state.version === "nil") return "00000000-0000-0000-0000-000000000000";
    if (state.version === "v1") return uuidV1();
    if (state.version === "v4") return uuidV4();
    return uuidNamed(state.version, namespaceValue(), state.name);
  }

  async function generate() {
    const output = document.getElementById("uuid-output");
    if (!output) return;
    try {
      if ((state.version === "v3" || state.version === "v5") && !state.name.trim()) throw new Error("Enter a name for v3/v5");
      if (state.version !== "nil" && (state.version === "v3" || state.version === "v5")) parseUuidBytes(namespaceValue());
      const values = [];
      for (let i = 0; i < state.quantity; i++) values.push(await generateOne());
      state.output = values;
      output.value = values.join("\n");
      document.getElementById("uuid-count").textContent = `${values.length} UUID${values.length === 1 ? "" : "s"}`;
    } catch (error) {
      output.value = `Error: ${error.message}`;
      document.getElementById("uuid-count").textContent = "Generation failed";
    }
  }

  function setVersion(version) {
    if (!UUID_MODES.includes(version)) return;
    state.version = version;
    document.querySelectorAll(".uuid-version").forEach((button) => button.classList.toggle("active", button.dataset.version === version));
    const descriptions = { nil: "All zeros", v1: "Time-based", v3: "MD5 + namespace", v4: "Random", v5: "SHA-1 + namespace" };
    document.getElementById("uuid-version-description").textContent = descriptions[version];
    const needsNamespace = version === "v3" || version === "v5";
    document.getElementById("uuid-namespace-fields").hidden = !needsNamespace;
    document.getElementById("uuid-custom-namespace-field").hidden = !needsNamespace || state.namespace !== "CUSTOM";
    generate();
  }

  function updateQuantity(value) {
    state.quantity = clampQuantity(value);
    document.getElementById("uuid-quantity").value = state.quantity;
    generate();
  }

  async function copyOutput() {
    const output = document.getElementById("uuid-output").value;
    if (!output || output.startsWith("Error:")) return;
    try {
      await navigator.clipboard.writeText(output);
      if (window.Swal) Swal.fire({ icon: "success", title: "UUIDs copied", toast: true, position: "top-end", timer: 1800, showConfirmButton: false });
    } catch (_) {
      const textarea = document.getElementById("uuid-output");
      textarea.select();
      document.execCommand("copy");
    }
  }

  function bindEvents() {
    document.querySelectorAll(".uuid-version").forEach((button) => button.addEventListener("click", () => setVersion(button.dataset.version)));
    document.getElementById("uuid-minus").addEventListener("click", () => updateQuantity(state.quantity - 1));
    document.getElementById("uuid-plus").addEventListener("click", () => updateQuantity(state.quantity + 1));
    document.getElementById("uuid-quantity").addEventListener("input", (event) => { state.quantity = clampQuantity(event.target.value); event.target.value = state.quantity; });
    document.getElementById("uuid-quantity").addEventListener("change", (event) => updateQuantity(event.target.value));
    document.getElementById("uuid-namespace").addEventListener("change", (event) => { state.namespace = event.target.value; document.getElementById("uuid-custom-namespace-field").hidden = state.namespace !== "CUSTOM"; generate(); });
    document.getElementById("uuid-custom-namespace").addEventListener("input", (event) => { state.customNamespace = event.target.value; });
    document.getElementById("uuid-custom-namespace").addEventListener("change", generate);
    document.getElementById("uuid-name").addEventListener("input", (event) => { state.name = event.target.value; });
    document.getElementById("uuid-name").addEventListener("change", generate);
    document.getElementById("uuid-refresh").addEventListener("click", generate);
    document.getElementById("uuid-copy").addEventListener("click", copyOutput);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
