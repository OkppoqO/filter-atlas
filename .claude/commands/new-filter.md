---
description: 依照 CLAUDE.md 規則新增一個濾波器頁面
argument-hint: <濾波器名稱，例如 Savitzky-Golay 濾波>
---

請為「$ARGUMENTS」新增一個濾波器頁面。

1. 先完整閱讀 `CLAUDE.md`，特別是第 4（頁面結構）、5（寫作風格）、7（demo 規格）、8（新增流程）節。
2. 參考一個既有頁面（例如 `filters/butterworth.html`）的語氣與深度。
3. 依第 8 節流程完成：
   - 在 `assets/js/filters.js` 實作演算法
   - 在 `assets/js/registry.js` 註冊（選擇正確的 category 與 level，放在合適的閱讀順序）
   - 複製 `templates/filter-page.html` 為 `filters/<slug>.html` 並填完所有內容
4. 執行 `node scripts/check.mjs`，有錯誤就修到全部通過。
5. 更新 `README.md` 的收錄清單。
6. 最後回報：新增了哪些檔案、slug、demo 的預設參數，以及任何標記為 `TODO: 待查證` 的地方。
