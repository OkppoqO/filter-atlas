# CLAUDE.md — 訊號濾波互動圖鑑（Signal Filter Atlas）

> 這份文件是給 AI（Claude Code、Codex 等）與協作者看的「專案說明書」。
> 動手修改任何檔案之前，請先完整讀完本文件。

---

## 1. 專案目的

一個**一種濾波器一頁**的互動教學網站。每一頁都能讓讀者：

1. 用一句話知道這個濾波器在做什麼；
2. **親手拉參數**，即時看到波形、誤差、延遲與頻率響應的變化；
3. 理解它的原理、優缺點，以及**在步態 / IMU 訊號分析中怎麼用**；
4. 拿到一段可以直接複製使用的 Python（NumPy / SciPy）程式碼。

**目標讀者**：剛進實驗室、要處理 IMU 步態訊號的碩士生，會寫 Python，但對數位濾波只有模糊印象。
**語言**：正文使用繁體中文（台灣用語），專有名詞第一次出現時附英文，例如「截止頻率（cutoff frequency）」。

---

## 2. 技術限制（不可違反）

| 規則 | 原因 |
|---|---|
| 純靜態網站：只用 HTML + CSS + 原生 JavaScript | 直接部署在 GitHub Pages，不需要 build |
| **不使用任何外部套件或 CDN**（包含 Chart.js、KaTeX、jQuery、字型 CDN） | 離線也能開、不怕連結失效 |
| 全站只有一個樣式表 `assets/css/style.css` | 風格一致 |
| 所有路徑使用**相對路徑** | 本機直接雙擊 html 與 GitHub Pages 都能用 |
| 不要用 `fetch()` 讀本機 JSON | 用 `file://` 開啟時會被瀏覽器擋下；資料一律放在 `.js` 檔 |

---

## 3. 檔案結構

```
filter-atlas/
├── CLAUDE.md                  ← 本文件（專案規則，唯一真實來源）
├── AGENTS.md                  ← 給其他 AI 代理的入口，指向本文件
├── README.md                  ← 給人看的專案簡介
├── index.html                 ← 首頁：自動依 registry 產生卡片
├── .nojekyll                  ← 讓 GitHub Pages 不經過 Jekyll 處理
├── filters/                   ← 每個濾波器一頁（只放 .html）
│   ├── moving-average.html
│   ├── exponential-moving-average.html
│   ├── median.html
│   ├── butterworth.html
│   └── kalman.html
├── assets/
│   ├── css/style.css          ← 全站唯一樣式表
│   └── js/
│       ├── registry.js        ← ★ 頁面清單（新增頁面一定要改）
│       ├── layout.js          ← 自動產生頁首、頁尾、上一頁/下一頁
│       ├── signal.js          ← 示範訊號產生器（全站共用，勿在頁面內另外產生訊號）
│       ├── filters.js         ← ★ 所有濾波演算法（新增濾波器一定要改）
│       ├── plot.js            ← Canvas 繪圖工具
│       └── demo.js            ← 互動 demo 元件 FilterDemo.mount()
├── templates/
│   └── filter-page.html       ← ★ 新頁面範本，複製它開始寫
├── scripts/
│   └── check.mjs              ← 規則檢查腳本（node scripts/check.mjs）
└── .claude/commands/
    └── new-filter.md          ← Claude Code 自訂指令 /new-filter
```

### 命名規則

- 頁面檔名 = `slug`，使用**英文小寫 kebab-case**：`filters/savitzky-golay.html`
- `slug` 必須與 `registry.js` 中的 `slug`、頁面 `<body data-slug="...">` **三者完全一致**
- 演算法函式名稱使用 **camelCase**：`Filters.savitzkyGolay`
- 參數 key 使用 camelCase 英文：`window`、`cutoff`、`polyOrder`

---

## 4. 頁面結構（每一頁都必須有，順序固定）

每個濾波器頁面由以下區塊組成，`id` 不可更改，`scripts/check.mjs` 會檢查：

| 順序 | 區塊 | `id` | 內容要求 |
|---|---|---|---|
| 0 | 標題區 | （`.hero`） | `.eyebrow`：「分類 · 難度」；`<h1>` 中文名 + `<span class="en">英文名</span>`；`.lead` 一句話說明（≤ 40 字） |
| 1 | 互動 demo | `demo` | 空的 `<section id="demo" class="demo"></section>`，內容由 `FilterDemo.mount()` 產生 |
| 2 | 原理 | `principle` | 白話解釋 + 至少一個 `<div class="formula">` 公式（純文字寫，不用 LaTeX） |
| 3 | 參數怎麼調 | `params` | 表格：參數 / 意義 / 調大會怎樣 / 建議起始值 |
| 4 | 優點與限制 | `tradeoffs` | `.pros-cons` 兩欄，各 3～4 點 |
| 5 | 步態訊號中的應用 | `gait` | 具體情境（例：IMU 角速度、足跟著地偵測、取樣率 100 Hz） |
| 6 | Python 實作 | `python` | 一段可直接執行的 NumPy / SciPy 程式碼，變數命名與 demo 參數一致 |
| 7 | 延伸閱讀 | `refs` | 2～4 筆：官方文件、教科書章節或論文 |

頁面最下方 `<script>` 載入順序固定為：
`registry.js → layout.js → signal.js → filters.js → plot.js → demo.js → 本頁 FilterDemo.mount(...)`

---

## 5. 寫作風格

- **先直覺、後數學**：每個區塊第一句話先講「這在幹嘛」，再給公式。
- 一段不超過 4 句；能用表格就不要用長段落。
- 每頁至少一次把概念連回「步態 / IMU」實際情境。
- 數字要具體：寫「截止頻率 6 Hz」而不是「適當的截止頻率」。
- 用 `<div class="callout">` 標註**常見誤區**，每頁最多 2 個。
- 不寫「顯而易見」「眾所周知」這類詞。

## 6. 視覺風格

- 色彩只能使用 `style.css` 中 `:root` 的 CSS 變數，**不要在 HTML 寫 inline 色碼**。
- 圖表配色固定：量測 `--plot-raw`（灰）、真實 `--plot-clean`（橘，虛線）、濾波後 `--plot-filtered`（綠，粗線）。
- 分類色：平滑 `--cat-smoothing`、頻域設計 `--cat-frequency`、非線性 `--cat-nonlinear`、狀態估計 `--cat-estimation`。
- 新增 UI 元件時，先檢查 `style.css` 是否已有可用 class；確定沒有才新增，並放在對應註解區段內。

---

## 7. 互動 demo 規格

所有 demo 都透過 `FilterDemo.mount()` 產生，**不要在頁面裡手寫 canvas 或另寫繪圖程式**。

```js
FilterDemo.mount("#demo", {
  filter: "butterworth",              // 對應 Filters.butterworth
  params: [
    { key: "cutoff", label: "截止頻率 fc", type: "range",
      min: 0.5, max: 20, step: 0.5, value: 5, unit: "Hz" },
    { key: "order", label: "階數", type: "select", value: "4",
      options: [{ value: "2", label: "2 階" }, { value: "4", label: "4 階" }] },
  ],
  signal: { noise: 0.25, spikes: false, drift: false }, // 選填
  linear: true,          // 線性濾波器 → 顯示頻率響應圖；非線性設 false
  markCutoff: "cutoff",  // 選填：在頻率響應圖標出此參數
  tryThis: [             // 必填，2～4 個引導讀者操作的小實驗
    "把截止頻率從 5 Hz 降到 1.5 Hz，觀察波峰被削掉多少。",
  ],
});
```

- `type: "range"` 需要 `min / max / step / value`，可加 `unit`；對數滑桿加 `display: "pow10"`。
- `type: "select"` 需要 `options` 陣列，`value` 一律寫成**字串**。
- demo 參數的**初始值**應該是「在預設訊號下效果合理」的值，讓讀者一打開就看到濾波有作用。
- `tryThis` 每一項都要是**可操作 + 有觀察重點**的句子（「把 A 調到 B，觀察 C」）。

### 演算法規格（`assets/js/filters.js`）

```js
Filters.名稱 = function (x, params, fs) { ... return Float64Array; }
```

- 純函式：不修改輸入 `x`、不碰 DOM、輸出長度與輸入相同。
- 邊界處理要寫清楚（截斷視窗 / 用第一個樣本當初值），並加中文註解。
- 若有對應的 SciPy 函式，實作結果應與之一致，並在註解中寫明對應關係。

### 示範訊號（`assets/js/signal.js`）

- 合成「類步態」小腿角速度：步頻 1 Hz + 2、3 倍諧波，fs = 100 Hz，長 6 秒。
- 讀者可切換：白雜訊強度、突波雜訊、基線漂移、亂數種子。
- **不要修改訊號產生器的預設值**，否則會影響所有頁面的既有說明文字。

---

## 8. 新增一個濾波器頁面的標準流程

> 在 Claude Code 中可以直接輸入：`/new-filter Savitzky-Golay 濾波`

1. **確認不重複**：檢查 `registry.js` 的 `FILTERS` 是否已有同一個濾波器。
2. **寫演算法**：在 `assets/js/filters.js` 新增 `Filters.xxx`，遵守第 7 節規格。
3. **註冊頁面**：在 `assets/js/registry.js` 的 `FILTERS` 加入一筆，欄位齊全：
   ```js
   { slug, title, en, category, level, summary, preview: { filter, params } }
   ```
   - `category` 只能是 `smoothing / frequency / nonlinear / estimation`；真的都不適合才在 `CATEGORIES` 新增，並同步在 `style.css` 加 `--cat-xxx` 顏色。
   - `level`：1 入門 / 2 進階 / 3 挑戰。依難度插入到陣列中適當位置（陣列順序 = 閱讀順序）。
   - `summary` ≤ 45 字，首頁卡片會顯示。
4. **建立頁面**：複製 `templates/filter-page.html` 到 `filters/<slug>.html`，替換所有 `{{...}}` 佔位符，依第 4、5 節填內容。
5. **執行檢查**：`node scripts/check.mjs`，必須全部通過（✅）。
6. **本機預覽**：直接用瀏覽器開啟 `index.html`，確認：首頁出現新卡片、導覽列出現新連結、demo 可拉動、上一頁/下一頁正確。
7. **更新 README.md** 的「目前收錄」清單。

## 9. 修改既有內容的規則

- 修改共用檔（`demo.js`、`plot.js`、`style.css`、`signal.js`）前，要確認**所有頁面**仍正常；改完跑 `node scripts/check.mjs`，並逐頁打開確認。
- 不刪除既有頁面的區塊；要調整頁面結構時，**先改本文件第 4 節**，再改範本、檢查腳本與所有頁面。
- 不要為了單一頁面的需求，在 `demo.js` 加入只有那一頁用得到的特例；改成通用的設定選項並寫進第 7 節。
- 數學或演算法內容不確定時，在頁面加上 `<!-- TODO: 待查證 -->` 註解並告知使用者，不要捏造參考文獻。

## 10. 完成前自我檢查清單

- [ ] `node scripts/check.mjs` 全數通過
- [ ] slug、檔名、`data-slug` 三者一致
- [ ] 7 個必要區塊齊全，順序正確
- [ ] demo 打開即可看到合理的濾波效果，`tryThis` 有 2～4 項
- [ ] Python 程式碼可直接執行（只依賴 numpy / scipy / matplotlib）
- [ ] 沒有外部 CDN、沒有 inline 色碼、沒有絕對路徑
- [ ] README 的收錄清單已更新

## 11. 部署

- GitHub Pages：Settings → Pages → Source 選 `Deploy from a branch`，Branch 選 `main` / `/ (root)`。
- 部署後把 `assets/js/registry.js` 中 `SITE.repo` 改成實際的 repository 網址。
