// Same-origin bootstrap for DuckDB-Wasm on static hosts such as GitHub Pages.
// The actual DuckDB worker is still fetched from jsDelivr, but the Worker
// itself is created from this repository's origin.
const source = new URLSearchParams(self.location.search).get('src');
if (!source) {
  throw new Error('DuckDB worker source URL is missing.');
}
importScripts(source);
