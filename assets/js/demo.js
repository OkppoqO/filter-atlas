/* =========================================================
   demo.js — 每個濾波器頁面共用的互動 demo 元件
   用法（寫在頁面最下方的 <script>）：

   FilterDemo.mount("#demo", {
     filter: "movingAverage",          // Filters 裡的函式名稱
     params: [                         // 這個濾波器的可調參數
       { key: "window", label: "視窗長度 N", type: "range",
         min: 1, max: 51, step: 2, value: 15, unit: "點" },
       { key: "mode", label: "計算方式", type: "select", value: "causal",
         options: [{ value: "causal", label: "因果" }, { value: "centered", label: "置中" }] },
     ],
     signal: { noise: 0.25, spikes: false, drift: false }, // 訊號初始設定（可省略）
     linear: true,          // 線性濾波器才畫頻率響應；非線性（如中值）設 false
     markCutoff: "cutoff",  // 選填：在頻率響應圖上標出某個參數（Hz）
     tryThis: ["...", "..."] // 2~4 個引導讀者操作的小實驗
   });

   參數 display 選項：
     "pow10" → 顯示 10^value（給對數滑桿用）
   ========================================================= */
(function () {
  const el = (tag, attrs = {}, html = "") => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    if (html) e.innerHTML = html;
    return e;
  };

  function formatValue(p, v) {
    if (p.display === "pow10") {
      const real = Math.pow(10, v);
      return real >= 0.01 ? real.toPrecision(2) : real.toExponential(0);
    }
    const s = Number.isInteger(p.step) ? String(Math.round(v)) : (+v).toFixed(String(p.step).split(".")[1]?.length || 2);
    return s + (p.unit ? " " + p.unit : "");
  }

  function rmse(a, b, from, to) {
    let s = 0;
    for (let i = from; i < to; i++) s += (a[i] - b[i]) ** 2;
    return Math.sqrt(s / (to - from));
  }

  // 用交互相關找濾波後訊號相對真實訊號的延遲（樣本數）
  function estimateLag(clean, y, maxLag, edge) {
    let best = 0, bestVal = -Infinity;
    for (let lag = -maxLag; lag <= maxLag; lag++) {
      let s = 0;
      for (let i = edge; i < clean.length - edge; i++) s += y[i] * clean[i - lag];
      if (s > bestVal) { bestVal = s; best = lag; }
    }
    return best;
  }

  // 用脈衝響應 + DFT 算線性濾波器的增益 |H(f)|
  function frequencyResponse(fn, params, fs) {
    const L = 1024, c = L / 2, imp = new Float64Array(L);
    imp[c] = 1;
    const h = fn(imp, params, fs);
    const M = 220, f = new Float64Array(M), g = new Float64Array(M);
    for (let m = 0; m < M; m++) {
      const fr = (m / (M - 1)) * (fs / 2);
      const w = (2 * Math.PI * fr) / fs;
      let re = 0, im = 0;
      for (let n = 0; n < L; n++) { re += h[n] * Math.cos(w * n); im -= h[n] * Math.sin(w * n); }
      f[m] = fr; g[m] = Math.hypot(re, im);
    }
    return { f, g };
  }

  function mount(selector, cfg) {
    const root = document.querySelector(selector);
    const fn = window.Filters[cfg.filter];
    if (!root || !fn) { console.error("FilterDemo: 找不到容器或濾波函式", selector, cfg.filter); return; }

    const sig = Object.assign({ noise: 0.25, spikes: false, drift: false, seed: 7, showClean: true }, cfg.signal);
    const params = {};
    cfg.params.forEach((p) => (params[p.key] = p.value));

    root.innerHTML = "";
    root.appendChild(el("h2", {}, "互動 demo"));
    const grid = el("div", { class: "demo-grid" });
    const controls = el("div", { class: "controls" });
    const plots = el("div", { class: "plots" });
    grid.append(controls, plots);
    root.appendChild(grid);

    /* ---- 濾波器參數 ---- */
    const fp = el("fieldset", { class: "control-group" });
    fp.appendChild(el("legend", {}, "濾波器參數"));
    cfg.params.forEach((p) => {
      const lab = el("label", { class: "control" });
      const out = el("output", {}, formatValue(p, p.value));
      const row = el("span", { class: "row" });
      row.append(el("span", {}, p.label), out);
      lab.appendChild(row);
      let input;
      if (p.type === "select") {
        input = el("select");
        p.options.forEach((o) => {
          const opt = el("option", { value: o.value }, o.label);
          if (String(o.value) === String(p.value)) opt.selected = true;
          input.appendChild(opt);
        });
        out.textContent = "";
        input.addEventListener("change", () => { params[p.key] = input.value; update(); });
      } else {
        input = el("input", { type: "range", min: p.min, max: p.max, step: p.step, value: p.value });
        input.addEventListener("input", () => {
          params[p.key] = parseFloat(input.value);
          out.textContent = formatValue(p, params[p.key]);
          update();
        });
      }
      lab.appendChild(input);
      fp.appendChild(lab);
    });
    controls.appendChild(fp);

    /* ---- 訊號設定（所有頁面一致） ---- */
    const sp = el("fieldset", { class: "control-group" });
    sp.appendChild(el("legend", {}, "輸入訊號"));
    const noiseLab = el("label", { class: "control" });
    const noiseOut = el("output", {}, sig.noise.toFixed(2));
    const noiseRow = el("span", { class: "row" });
    noiseRow.append(el("span", {}, "白雜訊強度 σ"), noiseOut);
    const noiseIn = el("input", { type: "range", min: 0, max: 0.8, step: 0.05, value: sig.noise });
    noiseIn.addEventListener("input", () => { sig.noise = +noiseIn.value; noiseOut.textContent = sig.noise.toFixed(2); update(true); });
    noiseLab.append(noiseRow, noiseIn);
    sp.appendChild(noiseLab);

    const addCheck = (key, text) => {
      const lab = el("label", { class: "check" });
      const cb = el("input", { type: "checkbox" });
      cb.checked = !!sig[key];
      cb.addEventListener("change", () => { sig[key] = cb.checked; update(key !== "showClean"); });
      lab.append(cb, document.createTextNode(text));
      sp.appendChild(lab);
    };
    addCheck("spikes", "加入突波雜訊");
    addCheck("drift", "加入基線漂移");
    addCheck("showClean", "顯示真實訊號");
    const reseed = el("button", { class: "btn", type: "button" }, "↻ 換一組雜訊");
    reseed.addEventListener("click", () => { sig.seed = Math.floor(Math.random() * 1e6); update(true); });
    sp.appendChild(reseed);
    controls.appendChild(sp);

    /* ---- 統計 ---- */
    const stats = el("div", { class: "stats" });
    const mkStat = (label) => {
      const s = el("div", { class: "stat" });
      const v = el("div", { class: "value" }, "–");
      s.append(el("div", { class: "label" }, label), v);
      stats.appendChild(s);
      return v;
    };
    const vRaw = mkStat("原始誤差 RMSE");
    const vFil = mkStat("濾波後 RMSE");
    const vLag = mkStat("估計延遲");

    /* ---- 圖 ---- */
    const timeCard = el("div", { class: "plot-card" });
    timeCard.appendChild(el("div", { class: "plot-title" },
      '<span>時域波形</span><span class="legend">' +
      '<span><i style="background:var(--plot-raw)"></i>量測</span>' +
      '<span><i style="background:var(--plot-clean)"></i>真實</span>' +
      '<span><i style="background:var(--plot-filtered)"></i>濾波後</span></span>'));
    const timeCanvas = el("canvas", { class: "canvas-time", "aria-label": "時域波形圖" });
    timeCard.appendChild(timeCanvas);
    plots.append(timeCard, stats);

    let freqCanvas = null;
    if (cfg.linear) {
      const fc = el("div", { class: "plot-card" });
      fc.appendChild(el("div", { class: "plot-title" }, "<span>頻率響應｜增益 |H(f)|</span><span class=\"legend\">陰影＝步態訊號主要頻帶</span>"));
      freqCanvas = el("canvas", { class: "canvas-freq", "aria-label": "頻率響應圖" });
      fc.appendChild(freqCanvas);
      plots.appendChild(fc);
    } else {
      plots.appendChild(el("div", { class: "callout" },
        "這是<strong>非線性</strong>濾波器，沒有固定的頻率響應，所以這裡不畫 |H(f)|。輸出會依輸入內容而改變。"));
    }

    if (cfg.tryThis && cfg.tryThis.length) {
      const t = el("div", { class: "try-this" });
      t.innerHTML = "<strong>🧪 動手試試看</strong><ol>" + cfg.tryThis.map((s) => "<li>" + s + "</li>").join("") + "</ol>";
      root.appendChild(t);
    }

    let data = null, y = null;
    function update(regen) {
      if (regen || !data) data = window.Signal.generate(sig);
      y = fn(data.noisy, params, data.fs);
      const edge = 30;
      const n = data.clean.length;
      const r0 = rmse(data.noisy, data.clean, edge, n - edge);
      const r1 = rmse(y, data.clean, edge, n - edge);
      vRaw.textContent = r0.toFixed(3);
      vFil.textContent = r1.toFixed(3);
      vFil.className = "value" + (r1 < r0 ? " good" : "");
      const lag = estimateLag(data.clean, y, 40, 45);
      vLag.textContent = Math.round((lag / data.fs) * 1000) + " ms";
      render();
    }

    function render() {
      const series = [{ y: data.noisy, color: "--plot-raw", width: 1 }];
      if (sig.showClean) series.push({ y: data.clean, color: "--plot-clean", width: 1.5, dash: [5, 4] });
      series.push({ y, color: "--plot-filtered", width: 2.2 });
      window.Plot.draw(timeCanvas, { x: data.t, series, xLabel: "時間 (s)", yLabel: "角速度 (a.u.)" });

      if (freqCanvas) {
        const { f, g } = frequencyResponse(fn, params, data.fs);
        const vLines = cfg.markCutoff ? [{ x: params[cfg.markCutoff], color: "--cat-frequency", label: "fc" }] : [];
        window.Plot.draw(freqCanvas, {
          x: f, series: [{ y: g, color: "--plot-filtered", width: 2 }],
          yRange: [0, 1.15], xLabel: "頻率 (Hz)",
          bands: [{ from: 0, to: 3.5 }],
          hLines: [{ y: Math.SQRT1_2, label: "−3 dB" }],
          vLines,
        });
      }
    }

    new ResizeObserver(() => data && render()).observe(timeCanvas);
    update(true);
  }

  /* 首頁縮圖用：畫一張不含軸的小預覽 */
  function preview(canvas, filterName, params) {
    const data = window.Signal.generate({ duration: 3, noise: 0.3, spikes: filterName === "median" });
    const y = window.Filters[filterName](data.noisy, params, data.fs);
    window.Plot.draw(canvas, {
      x: data.t, minimal: true,
      series: [
        { y: data.noisy, color: "--plot-raw", width: 1 },
        { y, color: "--plot-filtered", width: 2 },
      ],
    });
  }

  window.FilterDemo = { mount, preview };
})();
