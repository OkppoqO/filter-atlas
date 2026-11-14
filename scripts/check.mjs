#!/usr/bin/env node
/* =========================================================
   check.mjs — 依 CLAUDE.md 的規則自動檢查專案
   用法：node scripts/check.mjs
   不需要安裝任何套件（只用 Node.js 內建模組）。
   ========================================================= */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`❌ [${where}] ${msg}`);
const warn = (where, msg) => warnings.push(`⚠️  [${where}] ${msg}`);

// ---- 載入 registry.js 與 filters.js ----
const ctx = { window: {}, Math, Float64Array };
vm.createContext(ctx);
vm.runInContext(read("assets/js/registry.js"), ctx);
vm.runInContext(read("assets/js/filters.js"), ctx);
const { FILTERS, CATEGORIES, LEVELS, Filters } = ctx.window;

const REQUIRED_SECTIONS = ["demo", "principle", "params", "tradeoffs", "gait", "python", "refs"];
const SCRIPT_ORDER = ["registry.js", "layout.js", "signal.js", "filters.js", "plot.js", "demo.js"];
const css = read("assets/css/style.css");

// ---- 1. registry 欄位 ----
const seen = new Set();
FILTERS.forEach((f, i) => {
  const where = `registry #${i} ${f.slug || "?"}`;
  for (const k of ["slug", "title", "en", "category", "level", "summary", "preview"]) {
    if (f[k] === undefined || f[k] === "") err(where, `缺少欄位 ${k}`);
  }
  if (f.slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.slug)) err(where, "slug 必須是英文小寫 kebab-case");
  if (seen.has(f.slug)) err(where, "slug 重複");
  seen.add(f.slug);
  if (!CATEGORIES[f.category]) err(where, `category「${f.category}」不在 CATEGORIES 中`);
  else {
    const varName = CATEGORIES[f.category].color.match(/--[\w-]+/)?.[0];
    if (varName && !css.includes(varName + ":")) err(where, `style.css 缺少分類色 ${varName}`);
  }
  if (!LEVELS[f.level]) err(where, "level 只能是 1、2、3");
  if (f.summary && [...f.summary].length > 45) warn(where, `summary 超過 45 字（目前 ${[...f.summary].length} 字）`);
  if (f.preview && typeof Filters[f.preview.filter] !== "function") err(where, `preview.filter「${f.preview.filter}」在 filters.js 找不到`);
});

// ---- 2. 每個頁面 ----
const pageDir = path.join(ROOT, "filters");
const pageFiles = fs.readdirSync(pageDir).filter((n) => n.endsWith(".html"));

for (const f of FILTERS) {
  const rel = `filters/${f.slug}.html`;
  if (!fs.existsSync(path.join(ROOT, rel))) { err(rel, "檔案不存在（registry 有註冊但沒有頁面）"); continue; }
  const html = read(rel);

  const ds = html.match(/<body[^>]*data-slug="([^"]+)"/)?.[1];
  if (ds !== f.slug) err(rel, `<body data-slug> 為「${ds}」，應為「${f.slug}」`);
  if (!/<body[^>]*data-root="\.\."/.test(html)) err(rel, '<body> 需要 data-root=".."');

  if (html.includes("{{")) err(rel, "還有未替換的 {{佔位符}}");

  // 區塊與順序
  let last = -1;
  for (const id of REQUIRED_SECTIONS) {
    const idx = html.search(new RegExp(`<section[^>]*id="${id}"`));
    if (idx < 0) err(rel, `缺少區塊 #${id}`);
    else if (idx < last) err(rel, `區塊 #${id} 順序錯誤（應為 ${REQUIRED_SECTIONS.join(" → ")}）`);
    else last = idx;
  }
  if (!/<section id="demo" class="demo"><\/section>/.test(html)) warn(rel, "#demo 應保持空白，由 FilterDemo.mount() 產生");
  if (!/class="eyebrow"/.test(html) || !/class="lead"/.test(html)) err(rel, "標題區缺少 .eyebrow 或 .lead");
  if (!/<div class="formula">/.test(html)) err(rel, "原理區塊至少需要一個 .formula 公式");
  if (!/class="pros-cons"/.test(html)) err(rel, "優點與限制區塊需要 .pros-cons");
  if (!/<pre><code>[\s\S]*import numpy/.test(html)) warn(rel, "Python 區塊應包含 import numpy");

  // 標題文字一致
  if (!html.includes(f.title)) warn(rel, `頁面中找不到 registry 的 title「${f.title}」`);

  // script 載入順序
  const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => path.basename(m[1]));
  if (scripts.join() !== SCRIPT_ORDER.join()) err(rel, `script 載入順序應為 ${SCRIPT_ORDER.join(" → ")}`);

  // 禁止外部資源、絕對路徑、inline 色碼
  if (/<(script|link)[^>]+(src|href)="(https?:)?\/\//.test(html)) err(rel, "不可載入外部 CDN 資源");
  if (/(src|href)="\/(?!\/)/.test(html)) err(rel, "不可使用絕對路徑（以 / 開頭）");
  if (/style="[^"]*#[0-9a-fA-F]{3,6}/.test(html)) err(rel, "不可在 HTML 中寫 inline 色碼，請用 CSS 變數");

  // demo 設定
  const filterName = html.match(/FilterDemo\.mount\(\s*"#demo",\s*\{\s*filter:\s*"([^"]+)"/)?.[1];
  if (!filterName) err(rel, '找不到 FilterDemo.mount("#demo", { filter: ... })');
  else if (typeof Filters[filterName] !== "function") err(rel, `demo 使用的 Filters.${filterName} 不存在`);
  const tryBlock = html.match(/tryThis:\s*\[([\s\S]*?)\]\s*,?\s*\}\s*\)/)?.[1];
  const tryCount = tryBlock ? (tryBlock.match(/"(?:[^"\\]|\\.)+"/g) || []).length : 0;
  if (tryCount < 2 || tryCount > 4) err(rel, `tryThis 需要 2～4 項（目前 ${tryCount} 項）`);
}

// ---- 3. 孤兒頁面 ----
for (const name of pageFiles) {
  const slug = name.replace(/\.html$/, "");
  if (!seen.has(slug)) err(`filters/${name}`, "頁面存在但沒有在 registry.js 註冊");
}

// ---- 4. Filters 函式行為 ----
const probe = Array.from({ length: 200 }, (_, i) => Math.sin(i / 7) + (i % 13 === 0 ? 1 : 0));
for (const f of FILTERS) {
  const fn = Filters[f.preview?.filter];
  if (typeof fn !== "function") continue;
  const copy = probe.slice();
  const y = fn(copy, f.preview.params, 100);
  if (!y || y.length !== probe.length) err(`Filters.${f.preview.filter}`, "輸出長度必須與輸入相同");
  else if ([...y].some((v) => !Number.isFinite(v))) err(`Filters.${f.preview.filter}`, "輸出含有 NaN / Infinity");
  if (copy.some((v, i) => v !== probe[i])) err(`Filters.${f.preview.filter}`, "不可修改輸入陣列");
}

// ---- 5. README 收錄清單 ----
const readme = read("README.md");
for (const f of FILTERS) if (!readme.includes(f.title)) warn("README.md", `收錄清單缺少「${f.title}」`);

// ---- 結果 ----
console.log(`\n訊號濾波互動圖鑑｜規則檢查（${FILTERS.length} 個頁面）\n`);
warnings.forEach((w) => console.log(w));
errors.forEach((e) => console.log(e));
if (errors.length) {
  console.log(`\n共 ${errors.length} 個錯誤、${warnings.length} 個警告。請依 CLAUDE.md 修正。\n`);
  process.exit(1);
}
console.log(`✅ 全部通過${warnings.length ? `（${warnings.length} 個警告）` : ""}\n`);
