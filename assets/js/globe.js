/* =========================================================
   Visitor "Browsing Log" — rotating wireframe globe
   Pure canvas, no libs. Orthographic projection, graticule +
   glowing dots. Colors read from CSS vars so it tracks the
   theme. Data comes from the Cloudflare Worker (meta.browsingApi).
   Exposes window.VisitorGlobe.mount({canvas,list,endpoint,labels}).
   ========================================================= */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var S = {
    raf: null, canvas: null, ctx: null, list: null, labels: null,
    visitors: [], you: null, total: 0,
    fetched: false, loading: false, error: false,
    rot: -2.0, tick: 0, dpr: 1, W: 0, H: 0, R: 0, cx: 0, cy: 0,
  };

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function css(v) {
    return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  }
  function hexA(hex, a) {
    hex = (hex || "#7c8cff").replace("#", "");
    if (hex.length === 3) hex = hex.split("").map(function (c) { return c + c; }).join("");
    var n = parseInt(hex, 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }

  /* ---------- projection ---------- */
  function project(lat, lng, rot) {
    var phi = lat * Math.PI / 180, lam = lng * Math.PI / 180 + rot;
    return {
      x: Math.cos(phi) * Math.sin(lam),
      y: Math.sin(phi),
      z: Math.cos(phi) * Math.cos(lam),
    };
  }

  function resize() {
    var c = S.canvas; if (!c) return;
    var rect = c.getBoundingClientRect();
    if (!rect.width) return;
    S.dpr = Math.min(window.devicePixelRatio || 1, 2);
    S.W = rect.width; S.H = rect.height;
    c.width = Math.round(S.W * S.dpr);
    c.height = Math.round(S.H * S.dpr);
    S.ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    S.R = Math.min(S.W, S.H) * 0.42;
    S.cx = S.W / 2; S.cy = S.H / 2;
  }

  function arc(ctx, coords, R, cx, cy, style) {
    ctx.beginPath();
    var started = false;
    for (var i = 0; i < coords.length; i++) {
      var p = project(coords[i][0], coords[i][1], S.rot);
      var x = cx + p.x * R, y = cy - p.y * R;
      if (p.z >= -0.02) {
        if (!started) { ctx.moveTo(x, y); started = true; }
        else ctx.lineTo(x, y);
      } else started = false;
    }
    ctx.strokeStyle = style; ctx.lineWidth = 1; ctx.stroke();
  }

  function draw() {
    var ctx = S.ctx; if (!ctx || !S.W) return;
    var accent = css("--accent") || "#7c8cff";
    var accent2 = css("--accent-2") || "#4dd6c1";
    var dark = document.documentElement.getAttribute("data-theme") !== "light";
    var cx = S.cx, cy = S.cy, R = S.R;
    ctx.clearRect(0, 0, S.W, S.H);

    // inner sphere fill
    var g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R);
    g.addColorStop(0, hexA(accent, dark ? 0.12 : 0.07));
    g.addColorStop(1, hexA(accent, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.fill();

    // graticule
    var gcol = hexA(accent, dark ? 0.11 : 0.16);
    var la, lo, pts;
    for (la = -60; la <= 60; la += 30) {
      pts = [];
      for (lo = -180; lo <= 180; lo += 5) pts.push([la, lo]);
      arc(ctx, pts, R, cx, cy, gcol);
    }
    for (lo = 0; lo < 360; lo += 30) {
      pts = [];
      for (la = -90; la <= 90; la += 5) pts.push([la, lo]);
      arc(ctx, pts, R, cx, cy, gcol);
    }

    // rim
    ctx.strokeStyle = hexA(accent, dark ? 0.3 : 0.4); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.stroke();

    // visitor dots
    for (var i = 0; i < S.visitors.length; i++) {
      var v = S.visitors[i];
      var p = project(v.lat, v.lng, S.rot);
      if (p.z < 0) continue;
      var x = cx + p.x * R, y = cy - p.y * R;
      var depth = 0.45 + 0.55 * p.z;
      var isYou = !!S.you && i === 0;
      var col = isYou ? accent2 : accent;
      var r = (isYou ? 3.1 : 2.1) * depth;
      if (isYou && !reduce) {
        var pr = (S.tick % 96) / 96;
        ctx.beginPath(); ctx.arc(x, y, r + pr * 11, 0, 6.2832);
        ctx.strokeStyle = hexA(col, (1 - pr) * 0.55 * depth); ctx.lineWidth = 1.3; ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(x, y, r + 2.6, 0, 6.2832); ctx.fillStyle = hexA(col, 0.16 * depth); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fillStyle = hexA(col, 0.92 * depth); ctx.fill();
    }
  }

  function loop() {
    S.tick++;
    S.rot += 0.0016;
    draw();
    S.raf = requestAnimationFrame(loop);
  }

  /* ---------- side panel ---------- */
  function loc(v) {
    var a = v.city || v.region || "";
    var c = v.country || "";
    if (a && c) return a + ", " + c;
    return a || c || (S.labels && S.labels.somewhere) || "Somewhere";
  }
  function ago(ts) {
    var L = S.labels, s = Math.max(0, (Date.now() - ts) / 1000);
    if (s < 60) return L.justNow;
    var m = Math.floor(s / 60); if (m < 60) return m + L.mAgo;
    var h = Math.floor(m / 60); if (h < 24) return h + L.hAgo;
    return Math.floor(h / 24) + L.dAgo;
  }
  function row(v, you) {
    var r = el("div", "vg-row" + (you ? " vg-row--you" : ""));
    r.appendChild(el("span", "vg-flag", v.flag || "📍"));
    r.appendChild(el("span", "vg-loc", loc(v)));
    r.appendChild(el("span", "vg-ago", you ? S.labels.you : ago(v.ts)));
    return r;
  }
  function renderList() {
    var host = S.list, L = S.labels; if (!host || !L) return;
    host.innerHTML = "";
    var n = S.total || S.visitors.length || 0;
    host.appendChild(el("div", "vg-count",
      '<span class="vg-count__n">' + n + '</span> <span class="vg-count__l">' + L.visitors + "</span>"));
    if (S.you) host.appendChild(row(S.you, true));
    var recent = el("div", "vg-list");
    var start = S.you ? 1 : 0;
    S.visitors.slice(start, start + 8).forEach(function (v) { recent.appendChild(row(v, false)); });
    host.appendChild(recent);
    if (S.error) host.appendChild(el("div", "vg-note", L.offline));
    else if (S.loading && !S.fetched) host.appendChild(el("div", "vg-note", L.loading));
  }

  function fetchData(ep) {
    if (!ep || /YOUR-WORKER|example\.com|REPLACE/.test(ep)) { S.error = true; renderList(); return; }
    S.loading = true; renderList();
    fetch(ep, { mode: "cors" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        S.fetched = true; S.loading = false; S.error = false;
        S.total = d.total || 0;
        S.you = d.you || null;
        S.visitors = Array.isArray(d.visitors) ? d.visitors : [];
        renderList();
      })
      .catch(function () { S.loading = false; S.error = true; S.fetched = true; renderList(); });
  }

  /* ---------- public ---------- */
  function mount(opts) {
    S.labels = opts.labels || {};
    S.canvas = opts.canvas;
    S.ctx = S.canvas.getContext("2d");
    S.list = opts.list;
    if (S.raf) { cancelAnimationFrame(S.raf); S.raf = null; }
    resize();
    window.removeEventListener("resize", resize);
    window.addEventListener("resize", resize);
    if (reduce) draw(); else loop();
    renderList();
    if (!S.fetched) fetchData(opts.endpoint);
  }

  window.VisitorGlobe = { mount: mount };
})();
