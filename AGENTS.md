# AGENTS.md

本專案的完整規則寫在 **[CLAUDE.md](./CLAUDE.md)**，所有 AI 代理（Codex、Cursor、Gemini CLI、Claude Code 等）都適用。

開始任何工作之前，請先完整閱讀 `CLAUDE.md`。重點摘要：

- 這是「一種濾波器一頁」的純靜態互動教學網站（HTML + CSS + 原生 JS，無外部套件）。
- 新增頁面 = 改 `assets/js/filters.js` + 改 `assets/js/registry.js` + 複製 `templates/filter-page.html`。
- 每頁固定 7 個區塊：`demo → principle → params → tradeoffs → gait → python → refs`。
- 完成後必須執行 `node scripts/check.mjs` 並全部通過。
