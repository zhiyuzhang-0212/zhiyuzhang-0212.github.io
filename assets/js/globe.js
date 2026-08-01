/* =========================================================
   Visitor "Browsing Log" — flat world map, city-lights style
   Faint dotted continents (window.WORLD_DOTS) + glowing visitor
   points drawn with additive blending, so clusters bloom brighter
   like city lights seen from orbit. No rotation, no list.
   Colors read from CSS vars so it tracks the theme.
   Exposes window.VisitorMap.mount({canvas, count, endpoint, labels}).
   ========================================================= */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Equirectangular crop (skips empty polar bands so the map fills the frame)
  var LAT_TOP = 83, LAT_BOT = -56;
  var LAT_SPAN = LAT_TOP - LAT_BOT;

  var S = {
    raf: null, canvas: null, ctx: null, count: null, labels: null,
    base: null, bctx: null,
    visitors: [], you: null, total: 0,
    fetched: false, loading: false, error: false,
    tick: 0, dpr: 1, W: 0, H: 0,
  };

  function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
  function hexA(hex, a) {
    hex = (hex || "#7c8cff").replace("#", "");
    if (hex.length === 3) hex = hex.split("").map(function (c) { return c + c; }).join("");
    var n = parseInt(hex, 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }
  function projX(lon) { return (lon + 180) / 360 * S.W; }
  function projY(lat) { return (LAT_TOP - lat) / LAT_SPAN * S.H; }

  function resize() {
    var c = S.canvas; if (!c) return;
    var rect = c.getBoundingClientRect();
    if (!rect.width) return;
    S.dpr = Math.min(window.devicePixelRatio || 1, 2);
    S.W = rect.width; S.H = rect.height;
    c.width = Math.round(S.W * S.dpr);
    c.height = Math.round(S.H * S.dpr);
    S.ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    buildBase();
  }

  /* ---------- base layer: land dots + faint graticule (drawn once) ---------- */
  function buildBase() {
    if (!S.base) { S.base = document.createElement("canvas"); S.bctx = S.base.getContext("2d"); }
    S.base.width = Math.round(S.W * S.dpr);
    S.base.height = Math.round(S.H * S.dpr);
    var ctx = S.bctx;
    ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    ctx.clearRect(0, 0, S.W, S.H);
    var dark = document.documentElement.getAttribute("data-theme") !== "light";
    var accent = css("--accent") || "#7c8cff";

    // graticule — echoes the site's background grid, very faint
    ctx.strokeStyle = hexA(accent, dark ? 0.05 : 0.07);
    ctx.lineWidth = 1;
    for (var lo = -180; lo <= 180; lo += 30) {
      var x = projX(lo); ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, S.H); ctx.stroke();
    }
    for (var la = 60; la >= -40; la -= 30) {
      var y = projY(la); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(S.W, y); ctx.stroke();
    }

    // land dots
    var dots = window.WORLD_DOTS || [];
    var r = Math.max(0.6, S.W * 0.0016);
    ctx.fillStyle = hexA(accent, dark ? 0.16 : 0.22);
    for (var i = 0; i < dots.length; i++) {
      var px = projX(dots[i][0]), py = projY(dots[i][1]);
      ctx.beginPath(); ctx.arc(px, py, r, 0, 6.2832); ctx.fill();
    }
  }

  /* ---------- animated layer: glowing visitor lights ---------- */
  function draw() {
    var ctx = S.ctx; if (!ctx || !S.W) return;
    var accent2 = css("--accent-2") || "#4dd6c1";
    var accent = css("--accent") || "#7c8cff";
    ctx.clearRect(0, 0, S.W, S.H);
    if (S.base) ctx.drawImage(S.base, 0, 0, S.W, S.H);

    var glow = Math.max(9, S.W * 0.018);
    var t = S.tick;
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < S.visitors.length; i++) {
      var v = S.visitors[i];
      if (typeof v.lat !== "number" || typeof v.lng !== "number") continue;
      var x = projX(v.lng), y = projY(v.lat);
      var isYou = !!S.you && i === 0;
      var phase = (v.lng * 1.7 + v.lat * 2.3);
      var tw = reduce ? 1 : 0.72 + 0.28 * Math.sin(t * 0.05 + phase);
      var col = isYou ? accent2 : accent2; // teal city-lights
      var R = glow * (isYou ? 1.5 : 1);

      // outer bloom
      var g = ctx.createRadialGradient(x, y, 0, x, y, R);
      g.addColorStop(0, hexA(col, 0.55 * tw));
      g.addColorStop(0.4, hexA(col, 0.22 * tw));
      g.addColorStop(1, hexA(col, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, R, 0, 6.2832); ctx.fill();

      // hot core
      ctx.fillStyle = "rgba(233,255,250," + (0.9 * tw) + ")";
      ctx.beginPath(); ctx.arc(x, y, isYou ? 2.4 : 1.6, 0, 6.2832); ctx.fill();

      // pulse ring on the newest ("you")
      if (isYou && !reduce) {
        var pr = (t % 110) / 110;
        ctx.strokeStyle = hexA(accent, (1 - pr) * 0.5);
        ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.arc(x, y, 3 + pr * glow * 1.3, 0, 6.2832); ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = "source-over";

    // "you're here" callout next to the pulsing point (drawn on top, no bloom)
    if (S.you && typeof S.you.lat === "number" && typeof S.you.lng === "number") {
      drawYouLabel(ctx, projX(S.you.lng), projY(S.you.lat), accent2);
    }
  }

  function youText() {
    var y = S.you || {}, L = S.labels || {};
    var place = [y.city, y.country].filter(Boolean).join(", ") || L.somewhere || "";
    var here = L.you || "you're here";
    return (y.flag ? y.flag + " " : "") + here + (place ? " · " + place : "");
  }

  function drawYouLabel(ctx, x, y, accent2) {
    var txt = youText();
    ctx.font = '600 ' + Math.max(10, Math.round(S.W * 0.011)) + 'px ' +
      (css("--font-mono") || "monospace");
    var padX = 7, padY = 4, gap = 10;
    var tw = ctx.measureText(txt).width;
    var lh = Math.max(12, Math.round(S.W * 0.013));
    var bw = tw + padX * 2, bh = lh + padY * 2;
    // prefer upper-right of the dot; flip if it would clip the frame
    var bx = x + gap, by = y - gap - bh;
    if (bx + bw > S.W - 4) bx = x - gap - bw;
    if (bx < 4) bx = 4;
    if (by < 4) by = y + gap;
    if (by + bh > S.H - 4) by = S.H - 4 - bh;

    var dark = document.documentElement.getAttribute("data-theme") !== "light";
    // leader line from dot to the pill
    ctx.strokeStyle = hexA(accent2, 0.5);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(bx < x ? bx + bw : bx, by + bh / 2); ctx.stroke();
    // pill
    var rr = bh / 2;
    ctx.beginPath();
    ctx.moveTo(bx + rr, by);
    ctx.arcTo(bx + bw, by, bx + bw, by + bh, rr);
    ctx.arcTo(bx + bw, by + bh, bx, by + bh, rr);
    ctx.arcTo(bx, by + bh, bx, by, rr);
    ctx.arcTo(bx, by, bx + bw, by, rr);
    ctx.closePath();
    ctx.fillStyle = dark ? "rgba(12,14,22,0.78)" : "rgba(255,255,255,0.82)";
    ctx.fill();
    ctx.strokeStyle = hexA(accent2, 0.45);
    ctx.lineWidth = 1;
    ctx.stroke();
    // text
    ctx.fillStyle = css("--text") || (dark ? "#e8ecff" : "#141824");
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(txt, bx + padX, by + bh / 2 + 0.5);
  }

  function loop() { S.tick++; draw(); S.raf = requestAnimationFrame(loop); }

  function renderCount() {
    if (!S.count || !S.labels) return;
    if (S.error) { S.count.textContent = S.labels.offline; S.count.classList.add("is-note"); return; }
    if (!S.fetched && S.loading) { S.count.textContent = S.labels.loading; S.count.classList.add("is-note"); return; }
    S.count.classList.remove("is-note");
    var n = S.total || S.visitors.length || 0;
    S.count.innerHTML = '<span class="map-count__n">' + n + '</span> ' +
      '<span class="map-count__l">' + S.labels.visitors + "</span>";
  }

  function fetchData(ep) {
    if (!ep || /YOUR-WORKER|example\.com|REPLACE/.test(ep)) { S.error = true; renderCount(); return; }
    S.loading = true; renderCount();
    fetch(ep, { mode: "cors" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        S.fetched = true; S.loading = false; S.error = false;
        S.total = d.total || 0;
        S.you = d.you || null;
        S.visitors = Array.isArray(d.visitors) ? d.visitors : [];
        renderCount();
      })
      .catch(function () { S.loading = false; S.error = true; S.fetched = true; renderCount(); });
  }

  function mount(opts) {
    S.labels = opts.labels || {};
    S.canvas = opts.canvas;
    S.ctx = S.canvas.getContext("2d");
    S.count = opts.count || null;
    if (S.raf) { cancelAnimationFrame(S.raf); S.raf = null; }
    resize();
    window.removeEventListener("resize", resize);
    window.addEventListener("resize", resize);
    if (reduce) draw(); else loop();
    renderCount();
    if (!S.fetched) fetchData(opts.endpoint);
  }

  window.VisitorMap = { mount: mount };
})();
