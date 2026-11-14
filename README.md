# 〰 訊號濾波互動圖鑑 Signal Filter Atlas

一種濾波器一頁的互動教學網站。拉動參數就能即時看到波形、誤差、延遲與頻率響應的變化，
所有範例都使用同一段合成的**步態角速度訊號**（fs = 100 Hz），並說明在 IMU 步態分析中的實際用法。

🔗 **網站**：https://YOUR-ACCOUNT.github.io/filter-atlas/

## 目前收錄

| # | 濾波器 | 分類 | 難度 |
|---|---|---|---|
| 1 | [移動平均濾波](filters/moving-average.html) | 平滑 | 入門 |
| 2 | [指數移動平均](filters/exponential-moving-average.html) | 平滑 | 入門 |
| 3 | [中值濾波](filters/median.html) | 非線性 | 入門 |
| 4 | [Butterworth 低通濾波](filters/butterworth.html) | 頻域設計 | 進階 |
| 5 | [卡爾曼濾波](filters/kalman.html) | 狀態估計 | 挑戰 |

## 特色

- **零依賴**：純 HTML / CSS / 原生 JavaScript，不用安裝、不用 build，雙擊 `index.html` 就能開
- **規則驅動**：專案規則寫在 [`CLAUDE.md`](CLAUDE.md)，AI 讀完就能照同一套格式新增頁面
- **自動檢查**：`node scripts/check.mjs` 檢查每一頁是否符合規則
- **一行指令擴充**：在 Claude Code 中輸入 `/new-filter <濾波器名稱>`

## 新增一個濾波器

```bash
# 1. 在 Claude Code 中
/new-filter Savitzky-Golay 濾波

# 2. 或手動：改 filters.js → 改 registry.js → 複製 templates/filter-page.html
# 3. 檢查
node scripts/check.mjs
```

詳細流程見 [`CLAUDE.md`](CLAUDE.md) 第 8 節。

## 部署到 GitHub Pages

1. 將此資料夾推上 GitHub
2. Settings → Pages → Source：`Deploy from a branch`，Branch：`main`、`/ (root)`
3. 把 `assets/js/registry.js` 中 `SITE.repo` 與本檔網站連結換成自己的網址
