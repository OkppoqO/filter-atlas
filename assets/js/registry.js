/* =========================================================
   registry.js — 全站唯一的「頁面清單」
   新增濾波器頁面時，必須在 FILTERS 陣列加入一筆資料，
   首頁卡片、導覽列、上一頁/下一頁都由這裡自動產生。
   陣列順序 = 建議閱讀順序（由淺入深）。
   ========================================================= */

window.SITE = {
  title: "訊號濾波互動圖鑑",
  subtitle: "Signal Filter Atlas",
  // 上傳 GitHub 後，把下面網址改成你自己的 repository
  repo: "https://github.com/OkppoqO/filter-atlas",
};

window.CATEGORIES = {
  smoothing:  { label: "平滑",     color: "var(--cat-smoothing)" },
  frequency:  { label: "頻域設計", color: "var(--cat-frequency)" },
  nonlinear:  { label: "非線性",   color: "var(--cat-nonlinear)" },
  estimation: { label: "狀態估計", color: "var(--cat-estimation)" },
};

window.LEVELS = { 1: "入門", 2: "進階", 3: "挑戰" };

window.FILTERS = [
  {
    slug: "moving-average",
    title: "移動平均濾波",
    en: "Moving Average",
    category: "smoothing",
    level: 1,
    summary: "把相鄰幾個點平均起來，最直覺的平滑方法，也是理解「濾波會造成延遲」的起點。",
    preview: { filter: "movingAverage", params: { window: 15, mode: "causal" } },
  },
  {
    slug: "exponential-moving-average",
    title: "指數移動平均",
    en: "Exponential Moving Average (EMA)",
    category: "smoothing",
    level: 1,
    summary: "越新的資料權重越大，只要記住上一個輸出就能算，嵌入式裝置最愛用。",
    preview: { filter: "ema", params: { alpha: 0.15 } },
  },
  {
    slug: "median",
    title: "中值濾波",
    en: "Median Filter",
    category: "nonlinear",
    level: 1,
    summary: "取視窗內的中位數而不是平均，突波雜訊（spike）一個都留不住。",
    preview: { filter: "median", params: { window: 7 } },
  },
  {
    slug: "butterworth",
    title: "Butterworth 低通濾波",
    en: "Butterworth Low-pass",
    category: "frequency",
    level: 2,
    summary: "從頻率角度設計的濾波器，通帶最平坦。步態與 IMU 論文中最常見的前處理。",
    preview: { filter: "butterworth", params: { order: 4, cutoff: 5, zeroPhase: "yes" } },
  },
  {
    slug: "kalman",
    title: "卡爾曼濾波",
    en: "Kalman Filter",
    category: "estimation",
    level: 3,
    summary: "同時考慮「模型預測」和「量測」各有多可信，一步步更新最佳估計值。",
    preview: { filter: "kalman", params: { logQ: -2, logR: -1 } },
  },
];
