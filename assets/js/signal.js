/* =========================================================
   signal.js — 產生示範用的「類步態」訊號
   所有 demo 都使用同一個訊號產生器，才能互相比較。
   不要在個別頁面另外產生訊號。
   ========================================================= */
(function () {
  const DEFAULTS = {
    fs: 100,        // 取樣頻率 (Hz)，與常見 IMU 設定一致
    duration: 6,    // 秒
    stride: 1.0,    // 步頻 (Hz)，約每秒一步
    noise: 0.25,    // 高斯白雜訊標準差
    spikes: false,  // 是否加入突波雜訊
    drift: false,   // 是否加入基線漂移
    seed: 7,        // 亂數種子：同一個種子 → 同一組雜訊
  };

  // 可重現的亂數產生器 (mulberry32)
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function gaussian(rand) {
    let u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /**
   * 產生訊號
   * @returns {{fs:number, t:Float64Array, clean:Float64Array, noisy:Float64Array}}
   *   clean：真實訊號（模擬小腿角速度的形狀，含 1~3 倍步頻諧波）
   *   noisy：量測到的訊號（clean + 雜訊 + 選用的突波 / 漂移）
   */
  function generate(options) {
    const o = Object.assign({}, DEFAULTS, options);
    const n = Math.round(o.fs * o.duration);
    const t = new Float64Array(n);
    const clean = new Float64Array(n);
    const noisy = new Float64Array(n);
    const rand = mulberry32(o.seed);
    const w = 2 * Math.PI * o.stride;

    for (let i = 0; i < n; i++) {
      const tt = i / o.fs;
      t[i] = tt;
      clean[i] =
        1.0 * Math.sin(w * tt) +
        0.45 * Math.sin(2 * w * tt + 0.6) +
        0.2 * Math.sin(3 * w * tt + 1.3);

      let y = clean[i] + o.noise * gaussian(rand);
      if (o.drift) y += 0.8 * (tt / o.duration) + 0.25 * Math.sin(2 * Math.PI * 0.12 * tt);
      const r = rand();
      if (o.spikes && r < 0.02) y += (rand() < 0.5 ? -1 : 1) * (1.8 + 1.2 * rand());
      noisy[i] = y;
    }
    return { fs: o.fs, t, clean, noisy };
  }

  window.Signal = { generate, DEFAULTS };
})();
