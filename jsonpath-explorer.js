/* JSONPath Explorer - dependency-free local JSONPath implementation */
(() => {
  const MODE = "jsonpath";
  let lastResults = [];

  const escapeHtml = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const typeOf = (value) => {
    if (value === null) return "null";
    if (Array.isArray(value)) return "array";
    return typeof value;
  };

  const formatValue = (value) => JSON.stringify(value, null, 2);

  function tokenize(path) {
    const tokens = [];
    let i = 0;

    if (path[i] === "$") i += 1;
    while (i < path.length) {
      if (path.startsWith("..", i)) {
        i += 2;
        if (path[i] === "*") {
          tokens.push({ type: "recursive", key: "*" });
          i += 1;
        } else {
          const start = i;
          while (i < path.length && !".[]".includes(path[i])) i += 1;
          if (start === i) throw new Error("Expected a property after '..'");
          tokens.push({ type: "recursive", key: path.slice(start, i) });
        }
        continue;
      }

      if (path[i] === ".") {
        i += 1;
        if (path[i] === "*") {
          tokens.push({ type: "wildcard" });
          i += 1;
          continue;
        }
        const start = i;
        while (i < path.length && !".[]".includes(path[i])) i += 1;
        if (start === i) throw new Error("Expected a property after '.'");
        tokens.push({ type: "property", key: path.slice(start, i) });
        continue;
      }

      if (path[i] === "[") {
        const end = findClosingBracket(path, i);
        const raw = path.slice(i + 1, end).trim();
        if (!raw) throw new Error("Empty brackets are not valid");

        if (raw === "*") {
          tokens.push({ type: "wildcard" });
        } else if (/^-?\d+$/.test(raw)) {
          tokens.push({ type: "index", index: Number(raw) });
        } else if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
          tokens.push({ type: "property", key: raw.slice(1, -1) });
        } else if (raw.startsWith("?(") && raw.endsWith(")")) {
          tokens.push({ type: "filter", expression: raw.slice(2, -1).trim() });
        } else if (raw.includes(",")) {
          const keys = raw.split(",").map((item) => item.trim()).map((item) => {
            if ((item.startsWith("'") && item.endsWith("'")) || (item.startsWith('"') && item.endsWith('"'))) {
              return item.slice(1, -1);
            }
            if (/^-?\d+$/.test(item)) return Number(item);
            return item;
          });
          tokens.push({ type: "union", keys });
        } else {
          throw new Error(`Unsupported JSONPath expression: [${raw}]`);
        }

        i = end + 1;
        continue;
      }

      throw new Error(`Unexpected character '${path[i]}' at position ${i}`);
    }
    return tokens;
  }

  function findClosingBracket(path, start) {
    let quote = null;
    let depth = 0;
    for (let i = start; i < path.length; i += 1) {
      const char = path[i];
      if (quote) {
        if (char === quote && path[i - 1] !== "\\") quote = null;
        continue;
      }
      if (char === "'" || char === '"') {
        quote = char;
        continue;
      }
      if (char === "[") depth += 1;
      if (char === "]") {
        depth -= 1;
        if (depth === 0) return i;
      }
    }
    throw new Error("Missing closing ']' in JSONPath");
  }

  function childEntries(value) {
    if (Array.isArray(value)) return value.map((item, index) => [index, item]);
    if (value && typeof value === "object") return Object.entries(value);
    return [];
  }

  function recursiveEntries(value, key, basePath, out) {
    for (const [childKey, childValue] of childEntries(value)) {
      const childPath = Array.isArray(value)
        ? `${basePath}[${childKey}]`
        : `${basePath}.${childKey}`;

      if (key === "*" || String(childKey) === key) {
        out.push({ value: childValue, path: childPath });
      }
      recursiveEntries(childValue, key, childPath, out);
    }
  }

  function resolvePath(root, expression) {
    if (!expression || !expression.trim()) throw new Error("Enter a JSONPath expression");
    const path = expression.trim();
    if (!path.startsWith("$")) throw new Error("JSONPath must start with '$'");

    const tokens = tokenize(path);
    let nodes = [{ value: root, path: "$" }];

    for (const token of tokens) {
      const next = [];

      for (const node of nodes) {
        const value = node.value;

        if (token.type === "property") {
          if (value && typeof value === "object" && Object.prototype.hasOwnProperty.call(value, token.key)) {
            next.push({
              value: value[token.key],
              path: Array.isArray(value) ? `${node.path}[${token.key}]` : `${node.path}.${token.key}`,
            });
          }
        } else if (token.type === "index") {
          if (Array.isArray(value)) {
            const index = token.index < 0 ? value.length + token.index : token.index;
            if (index >= 0 && index < value.length) {
              next.push({ value: value[index], path: `${node.path}[${index}]` });
            }
          }
        } else if (token.type === "wildcard") {
          for (const [key, child] of childEntries(value)) {
            next.push({
              value: child,
              path: Array.isArray(value) ? `${node.path}[${key}]` : `${node.path}.${key}`,
            });
          }
        } else if (token.type === "union") {
          for (const key of token.keys) {
            if (typeof key === "number" && Array.isArray(value) && value[key] !== undefined) {
              next.push({ value: value[key], path: `${node.path}[${key}]` });
            } else if (typeof key === "string" && value && typeof value === "object" && key in value) {
              next.push({ value: value[key], path: Array.isArray(value) ? `${node.path}[${key}]` : `${node.path}.${key}` });
            }
          }
        } else if (token.type === "recursive") {
          recursiveEntries(value, token.key, node.path, next);
        } else if (token.type === "filter") {
          for (const [key, child] of childEntries(value)) {
            if (matchesFilter(child, token.expression)) {
              next.push({
                value: child,
                path: Array.isArray(value) ? `${node.path}[${key}]` : `${node.path}.${key}`,
              });
            }
          }
        }
      }

      nodes = next;
    }

    return nodes;
  }

  function getFilterValue(value, ref) {
    if (ref === "@") return value;
    if (!ref.startsWith("@.")) return undefined;
    return ref.slice(2).split(".").reduce((current, key) => {
      if (current == null) return undefined;
      return current[key];
    }, value);
  }

  function parseLiteral(raw) {
    const value = raw.trim();
    if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
      return value.slice(1, -1);
    }
    if (value === "true") return true;
    if (value === "false") return false;
    if (value === "null") return null;
    if (!Number.isNaN(Number(value))) return Number(value);
    return value;
  }

  function matchesFilter(value, expression) {
    const match = expression.match(/^(@(?:\.[A-Za-z_$][\w$]*)*|@)\s*(==|!=|>=|<=|>|<|contains)\s*(.+)$/);
    if (!match) throw new Error(`Unsupported filter: ?(${expression})`);
    const left = getFilterValue(value, match[1]);
    const right = parseLiteral(match[3]);
    switch (match[2]) {
      case "==": return left === right;
      case "!=": return left !== right;
      case ">": return left > right;
      case "<": return left < right;
      case ">=": return left >= right;
      case "<=": return left <= right;
      case "contains": return typeof left === "string" && left.includes(String(right));
      default: return false;
    }
  }

  function currentInput() {
    return document.getElementById("jsonpath-input");
  }

  function currentQuery() {
    return document.getElementById("jsonpath-query");
  }

  function runQuery() {
    const input = currentInput();
    const query = currentQuery();
    const result = document.getElementById("jsonpath-results");
    const count = document.getElementById("jsonpath-count");
    const error = document.getElementById("jsonpath-error");

    error.textContent = "";
    result.innerHTML = "";

    let data;
    try {
      data = JSON.parse(input.value);
    } catch (e) {
      count.textContent = "";
      error.textContent = `Invalid JSON: ${e.message}`;
      return;
    }

    try {
      lastResults = resolvePath(data, query.value);
      count.textContent = `${lastResults.length} match${lastResults.length === 1 ? "" : "es"}`;
      renderResults();
    } catch (e) {
      lastResults = [];
      count.textContent = "";
      error.textContent = e.message;
    }
  }

  function renderResults() {
    const container = document.getElementById("jsonpath-results");
    if (!lastResults.length) {
      container.innerHTML = '<div class="jsonpath-empty">No matches found for this expression.</div>';
      return;
    }

    container.innerHTML = lastResults.map((item, index) => `
      <article class="jsonpath-result-card">
        <div class="jsonpath-result-header">
          <div>
            <button class="jsonpath-path" data-index="${index}" title="Copy JSONPath">${escapeHtml(item.path)}</button>
            <span class="jsonpath-type">${typeOf(item.value)}</span>
          </div>
          <button class="secondary-action jsonpath-copy" data-index="${index}"><i class="fas fa-copy"></i> Copy</button>
        </div>
        <pre class="code-output jsonpath-value">${escapeHtml(formatValue(item.value))}</pre>
      </article>
    `).join("");

    container.querySelectorAll(".jsonpath-copy").forEach((button) => {
      button.addEventListener("click", () => copyValue(lastResults[Number(button.dataset.index)].value));
    });
    container.querySelectorAll(".jsonpath-path").forEach((button) => {
      button.addEventListener("click", () => copyText(button.textContent, "JSONPath copied"));
    });
  }

  async function copyText(text, successMessage) {
    try {
      await navigator.clipboard.writeText(text);
      if (window.Swal) Swal.fire({ icon: "success", title: successMessage, toast: true, position: "top-end", timer: 1400, showConfirmButton: false });
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
  }

  function copyValue(value) {
    copyText(JSON.stringify(value, null, 2), "Result copied");
  }

  function copyAll() {
    copyText(JSON.stringify(lastResults.map((item) => item.value), null, 2), "All results copied");
  }

  function downloadResults() {
    const blob = new Blob([JSON.stringify(lastResults.map((item) => item.value), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "jsonpath-results.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function loadExample() {
    currentInput().value = JSON.stringify({
      store: {
        book: [
          { category: "reference", author: "Nigel Rees", price: 8.95 },
          { category: "fiction", author: "Evelyn Waugh", price: 12.99 },
          { category: "fiction", author: "Herman Melville", price: 8.99 },
          { category: "fiction", author: "J. R. R. Tolkien", price: 22.99 }
        ],
        bicycle: { color: "red", price: 19.95 }
      }
    }, null, 2);
    currentQuery().value = "$.store.book[*].author";
    runQuery();
  }

  function addSidebarItem() {
    const group = document.querySelector(".feature-group");
    if (!group || group.querySelector("[onclick*=jsonpath]")) return;
    const button = document.createElement("button");
    button.className = "feature-item";
    button.setAttribute("onclick", "switchMode('jsonpath')");
    button.innerHTML = '<span class="feature-icon"><i class="fas fa-route"></i></span><span class="feature-copy"><strong>JSONPath Explorer</strong><small>Query JSON data</small></span><kbd>9</kbd>';
    group.insertBefore(button, group.children[1] || null);
  }

  function createSection() {
    const section = document.createElement("section");
    section.id = "jsonpath-section";
    section.className = "tool-section";
    section.style.display = "none";
    section.innerHTML = `
      <div class="section-heading">
        <div>
          <span class="section-kicker">Query & inspect</span>
          <h2>JSONPath Explorer</h2>
          <p>Query nested JSON with paths, wildcards, recursive descent and filters — entirely in your browser.</p>
        </div>
      </div>

      <div class="jsonpath-toolbar">
        <div class="jsonpath-query-wrap">
          <label for="jsonpath-query">JSONPath</label>
          <div class="jsonpath-query-row">
            <input id="jsonpath-query" type="text" value="$.store.book[*].author" spellcheck="false" autocomplete="off" />
            <button id="jsonpath-run" class="primary-action"><i class="fas fa-play"></i> Run</button>
          </div>
          <div class="jsonpath-examples">
            <button data-query="$.store.book[*].author">All authors</button>
            <button data-query="$.store.book[?(@.price &lt; 10)]">Books &lt; $10</button>
            <button data-query="$..price">All prices</button>
            <button data-query="$.store.*">Store values</button>
          </div>
        </div>
      </div>

      <div class="jsonpath-grid">
        <div class="jsonpath-panel">
          <div class="jsonpath-panel-heading">
            <div><strong>JSON Input</strong><span>Paste, edit or load an example</span></div>
            <button id="jsonpath-example" class="secondary-action">Load example</button>
          </div>
          <textarea id="jsonpath-input" class="json-input" spellcheck="false" placeholder='{"users":[{"name":"John"},{"name":"Jane"}]}'></textarea>
        </div>

        <div class="jsonpath-panel">
          <div class="jsonpath-panel-heading">
            <div><strong>Query Results</strong><span id="jsonpath-count"></span></div>
            <div class="jsonpath-actions">
              <button id="jsonpath-copy-all" class="secondary-action">Copy all</button>
              <button id="jsonpath-download" class="secondary-action">Download</button>
            </div>
          </div>
          <div id="jsonpath-error" class="jsonpath-error"></div>
          <div id="jsonpath-results" class="jsonpath-results"></div>
        </div>
      </div>

      <div class="jsonpath-help">
        <div><code>$</code><span>Root</span></div>
        <div><code>.</code><span>Child property</span></div>
        <div><code>[*]</code><span>All children</span></div>
        <div><code>..</code><span>Recursive descent</span></div>
        <div><code>[?()]</code><span>Filter</span></div>
        <div><code>[0]</code><span>Array index</span></div>
      </div>
    `;
    return section;
  }

  function install() {
    addSidebarItem();
    const shell = document.querySelector(".workspace-shell");
    if (!shell || document.getElementById("jsonpath-section")) return;

    shell.appendChild(createSection());

    const originalSwitchMode = window.switchMode;
    window.switchMode = function (mode) {
      const section = document.getElementById("jsonpath-section");
      if (section) section.style.display = mode === MODE ? "block" : "none";
      originalSwitchMode(mode);
      if (mode === MODE) {
        document.querySelectorAll(".feature-item").forEach((item) => item.classList.toggle("active", item.getAttribute("onclick")?.includes("jsonpath")));
      }
    };

    document.getElementById("jsonpath-run").addEventListener("click", runQuery);
    document.getElementById("jsonpath-query").addEventListener("keydown", (event) => {
      if (event.key === "Enter") runQuery();
    });
    document.getElementById("jsonpath-input").addEventListener("input", () => {
      clearTimeout(window.__jsonpJsonPathTimer);
      window.__jsonpJsonPathTimer = setTimeout(runQuery, 250);
    });
    document.getElementById("jsonpath-example").addEventListener("click", loadExample);
    document.getElementById("jsonpath-copy-all").addEventListener("click", copyAll);
    document.getElementById("jsonpath-download").addEventListener("click", downloadResults);

    document.querySelectorAll(".jsonpath-examples button").forEach((button) => {
      button.addEventListener("click", () => {
        currentQuery().value = button.dataset.query;
        runQuery();
      });
    });

    loadExample();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
