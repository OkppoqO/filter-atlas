/* =========================================================
   layout.js — 依 registry.js 自動產生頁首導覽、頁尾、上一頁/下一頁
   頁面只需要：
     <body data-slug="moving-average" data-root="..">
     <header id="site-header"></header> ... <footer id="site-footer"></footer>
   首頁使用 data-slug="home" data-root="."
   ========================================================= */
(function () {
  const body = document.body;
  const slug = body.dataset.slug;
  const root = body.dataset.root || ".";
  const list = window.FILTERS;
  const href = (f) => `${root}/filters/${f.slug}.html`;

  const header = document.getElementById("site-header");
  if (header) {
    header.className = "site-header";
    header.innerHTML =
      `<div class="inner">
         <a class="brand" href="${root}/index.html">〰 訊號濾波<span>互動圖鑑</span></a>
         <nav class="site-nav" aria-label="濾波器">
           ${list.map((f) => `<a href="${href(f)}" class="${f.slug === slug ? "active" : ""}">${f.title}</a>`).join("")}
         </nav>
       </div>`;
  }

  const footer = document.getElementById("site-footer");
  if (footer) {
    footer.className = "site-footer";
    const i = list.findIndex((f) => f.slug === slug);
    let pager = "";
    if (i >= 0) {
      const prev = list[i - 1], next = list[i + 1];
      pager = `<div class="pager">
        ${prev ? `<a class="prev" href="${href(prev)}"><span class="dir">← 上一個</span>${prev.title}</a>` : `<a class="prev" href="${root}/index.html"><span class="dir">← 回到</span>全部濾波器</a>`}
        ${next ? `<a class="next" href="${href(next)}"><span class="dir">下一個 →</span>${next.title}</a>` : `<a class="next" href="${root}/index.html"><span class="dir">回到 →</span>全部濾波器</a>`}
      </div>`;
    }
    footer.innerHTML = `${pager}
      <div>${window.SITE.title} · ${window.SITE.subtitle} ·
      示範訊號為合成的類步態角速度（fs = 100 Hz）·
      <a href="${window.SITE.repo}">GitHub 原始碼與 CLAUDE.md</a></div>`;
  }

  // 頁籤標題統一格式：「濾波器名稱｜網站名稱」
  const f = list.find((x) => x.slug === slug);
  if (f) document.title = `${f.title} ${f.en}｜${window.SITE.title}`;
})();
