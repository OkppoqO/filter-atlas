/* =========================================================
   plot.js — 極簡 Canvas 折線圖（不依賴任何圖表套件）
   Plot.draw(canvas, {
     x: Float64Array,                  // 共用 x 軸
     series: [{ y, color, width, dash, alpha }],
     xLabel, yLabel, yRange: [min,max] (可省略，自動),
     hLines: [{ y, color, dash, label }],  // 水平參考線
     vLines: [{ x, color, dash, label }],  // 垂直參考線
     bands:  [{ from, to, color, label }], // x 方向的底色區間
     minimal: false                    // true = 不畫軸與格線（首頁縮圖用）
   })
   顏色可以寫 CSS 變數名稱，例如 "--plot-raw"。
   ========================================================= */
(function () {
  function cssVar(v) {
    if (typeof v === "string" && v.startsWith("--")) {
      return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || "#888";
    }
    return v;
  }

  function niceTicks(min, max, count) {
    const span = max - min || 1;
    const step0 = span / count;
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const norm = step0 / mag;
    const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
    const ticks = [];
    for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) ticks.push(+v.toFixed(10));
    return ticks;
  }

  function fmt(v) {
    if (Math.abs(v) >= 100) return v.toFixed(0);
    if (Math.abs(v) >= 10) return v.toFixed(0);
    return (+v.toFixed(2)).toString();
  }

  function draw(canvas, opt) {
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth, H = canvas.clientHeight;
    if (!W || !H) return;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const minimal = !!opt.minimal;
    const pad = minimal ? { l: 2, r: 2, t: 4, b: 4 } : { l: 40, r: 10, t: 8, b: 26 };
    const x = opt.x;
    const x0 = x[0], x1 = x[x.length - 1];

    let yMin, yMax;
    if (opt.yRange) [yMin, yMax] = opt.yRange;
    else {
      yMin = Infinity; yMax = -Infinity;
      for (const s of opt.series) for (const v of s.y) { if (v < yMin) yMin = v; if (v > yMax) yMax = v; }
      const m = (yMax - yMin) * 0.08 || 1;
      yMin -= m; yMax += m;
    }

    const px = (v) => pad.l + ((v - x0) / (x1 - x0)) * (W - pad.l - pad.r);
    const py = (v) => pad.t + (1 - (v - yMin) / (yMax - yMin)) * (H - pad.t - pad.b);

    // 區間底色
    for (const b of opt.bands || []) {
      ctx.fillStyle = cssVar(b.color || "--plot-band");
      ctx.fillRect(px(b.from), pad.t, px(b.to) - px(b.from), H - pad.t - pad.b);
      if (b.label && !minimal) {
        ctx.fillStyle = cssVar("--ink-faint");
        ctx.font = "11px " + cssVar("--font-sans");
        ctx.fillText(b.label, px(b.from) + 4, pad.t + 12);
      }
    }

    if (!minimal) {
      ctx.font = "11px " + cssVar("--font-sans");
      ctx.strokeStyle = cssVar("--plot-grid");
      ctx.fillStyle = cssVar("--ink-faint");
      ctx.lineWidth = 1;
      for (const v of niceTicks(yMin, yMax, 4)) {
        const yy = Math.round(py(v)) + 0.5;
        ctx.beginPath(); ctx.moveTo(pad.l, yy); ctx.lineTo(W - pad.r, yy); ctx.stroke();
        ctx.textAlign = "right"; ctx.fillText(fmt(v), pad.l - 6, yy + 4);
      }
      ctx.textAlign = "center";
      for (const v of niceTicks(x0, x1, 6)) {
        const xx = Math.round(px(v)) + 0.5;
        ctx.beginPath(); ctx.moveTo(xx, pad.t); ctx.lineTo(xx, H - pad.b); ctx.stroke();
        ctx.fillText(fmt(v), xx, H - pad.b + 14);
      }
      if (opt.xLabel) { ctx.textAlign = "right"; ctx.fillText(opt.xLabel, W - pad.r, H - 2); }
      if (opt.yLabel) { ctx.textAlign = "left"; ctx.fillText(opt.yLabel, 2, pad.t + 10); }
    }

    const refLine = (x1_, y1_, x2_, y2_, l) => {
      ctx.save();
      ctx.strokeStyle = cssVar(l.color || "--ink-faint");
      ctx.setLineDash(l.dash || [4, 4]);
      ctx.beginPath(); ctx.moveTo(x1_, y1_); ctx.lineTo(x2_, y2_); ctx.stroke();
      ctx.restore();
    };
    for (const l of opt.hLines || []) {
      refLine(pad.l, py(l.y), W - pad.r, py(l.y), l);
      if (l.label && !minimal) { ctx.fillStyle = cssVar(l.color || "--ink-faint"); ctx.textAlign = "right"; ctx.fillText(l.label, W - pad.r - 2, py(l.y) - 4); }
    }
    for (const l of opt.vLines || []) {
      refLine(px(l.x), pad.t, px(l.x), H - pad.b, l);
      if (l.label && !minimal) { ctx.fillStyle = cssVar(l.color || "--ink-faint"); ctx.textAlign = "left"; ctx.fillText(l.label, px(l.x) + 4, H - pad.b - 6); }
    }

    // 資料線
    ctx.save();
    ctx.beginPath(); ctx.rect(pad.l, pad.t, W - pad.l - pad.r, H - pad.t - pad.b); ctx.clip();
    for (const s of opt.series) {
      ctx.strokeStyle = cssVar(s.color);
      ctx.globalAlpha = s.alpha == null ? 1 : s.alpha;
      ctx.lineWidth = s.width || 1.5;
      ctx.lineJoin = "round";
      ctx.setLineDash(s.dash || []);
      ctx.beginPath();
      for (let i = 0; i < s.y.length; i++) {
        const X = px(x[i]), Y = py(s.y[i]);
        i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  window.Plot = { draw, cssVar };
})();
