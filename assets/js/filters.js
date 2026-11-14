/* =========================================================
   filters.js — 所有濾波演算法的唯一存放處
   函式簽名一律為：
       Filters.名稱(x, params, fs) -> Float64Array（長度與 x 相同）
   - x      : 輸入訊號 (Array / Float64Array)
   - params : 物件，key 與頁面 demo 設定的 params[].key 一致
   - fs     : 取樣頻率 (Hz)
   規則：純函式、不碰 DOM、不使用外部套件。
   ========================================================= */
(function () {
  const Filters = {};

  /* ---------- 移動平均 ---------- */
  Filters.movingAverage = function (x, p) {
    const n = x.length, w = Math.max(1, Math.round(p.window));
    const y = new Float64Array(n);
    if (p.mode === "centered") {
      const half = Math.floor(w / 2);
      for (let i = 0; i < n; i++) {
        let s = 0, c = 0;
        for (let k = i - half; k <= i + half; k++) if (k >= 0 && k < n) { s += x[k]; c++; }
        y[i] = s / c;
      }
    } else {
      // causal：只用「現在與過去」的資料，即時系統只能這樣做
      let s = 0;
      for (let i = 0; i < n; i++) {
        s += x[i];
        if (i >= w) s -= x[i - w];
        y[i] = s / Math.min(i + 1, w);
      }
    }
    return y;
  };

  /* ---------- 指數移動平均 ---------- */
  Filters.ema = function (x, p) {
    const a = p.alpha, n = x.length, y = new Float64Array(n);
    y[0] = x[0];
    for (let i = 1; i < n; i++) y[i] = a * x[i] + (1 - a) * y[i - 1];
    return y;
  };

  /* ---------- 中值濾波 ---------- */
  Filters.median = function (x, p) {
    const n = x.length, half = Math.floor(Math.round(p.window) / 2);
    const y = new Float64Array(n), buf = [];
    for (let i = 0; i < n; i++) {
      buf.length = 0;
      for (let k = i - half; k <= i + half; k++) if (k >= 0 && k < n) buf.push(x[k]);
      buf.sort((a, b) => a - b);
      const m = buf.length >> 1;
      y[i] = buf.length % 2 ? buf[m] : 0.5 * (buf[m - 1] + buf[m]);
    }
    return y;
  };

  /* ---------- Butterworth 低通 ----------
     以 N/2 個二階節 (biquad) 串接實作，第 k 節的 Q 值
     Q_k = 1 / (2 sin((2k-1)π / 2N))，用雙線性轉換 + 預扭曲，
     結果等同 scipy.signal.butter(N, fc, fs=fs) 的頻率響應。 */
  function biquadLowpass(fc, fs, Q) {
    const w0 = (2 * Math.PI * fc) / fs, c = Math.cos(w0), s = Math.sin(w0);
    const alpha = s / (2 * Q), a0 = 1 + alpha;
    return {
      b0: (1 - c) / 2 / a0, b1: (1 - c) / a0, b2: (1 - c) / 2 / a0,
      a1: (-2 * c) / a0, a2: (1 - alpha) / a0,
    };
  }

  function applyBiquad(x, f) {
    const n = x.length, y = new Float64Array(n);
    // 以第一個樣本的穩態作為初始狀態，避免開頭出現暫態跳動
    const x0 = x[0];
    let z2 = (f.b2 - f.a2) * x0;
    let z1 = (f.b1 - f.a1) * x0 + z2;
    for (let i = 0; i < n; i++) {
      const xi = x[i], yi = f.b0 * xi + z1;
      z1 = f.b1 * xi - f.a1 * yi + z2;
      z2 = f.b2 * xi - f.a2 * yi;
      y[i] = yi;
    }
    return y;
  }

  function butterCascade(x, order, fc, fs) {
    let y = Float64Array.from(x);
    for (let k = 1; k <= order / 2; k++) {
      const Q = 1 / (2 * Math.sin(((2 * k - 1) * Math.PI) / (2 * order)));
      y = applyBiquad(y, biquadLowpass(fc, fs, Q));
    }
    return y;
  }

  Filters.butterworth = function (x, p, fs) {
    const order = Number(p.order), fc = Math.min(p.cutoff, fs * 0.45);
    let y = butterCascade(x, order, fc, fs);
    if (p.zeroPhase === "yes") {
      // filtfilt：正向濾一次、反向再濾一次 → 相位延遲互相抵消
      y.reverse();
      y = butterCascade(y, order, fc, fs);
      y.reverse();
    }
    return y;
  };

  /* ---------- 一維卡爾曼濾波（隨機漫步模型） ----------
     狀態模型： x_k = x_{k-1} + w,  w ~ N(0, Q)
     量測模型： z_k = x_k + v,      v ~ N(0, R)
     頁面上的 logQ / logR 是以 10 為底的對數，方便用滑桿跨數量級調整。 */
  Filters.kalman = function (x, p) {
    const Q = Math.pow(10, p.logQ), R = Math.pow(10, p.logR);
    const n = x.length, y = new Float64Array(n);
    let est = x[0], P = 1;
    for (let i = 0; i < n; i++) {
      P = P + Q;                 // 預測
      const K = P / (P + R);     // 卡爾曼增益
      est = est + K * (x[i] - est); // 更新
      P = (1 - K) * P;
      y[i] = est;
    }
    return y;
  };

  window.Filters = Filters;
})();
