/* =========================================================
   Zhiyu Zhang — personal site
   Data-driven rendering + theme/lang toggles + motion.
   ========================================================= */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;

  /* ---------- Inline icon set ---------- */
  var ICONS = {
    github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17 4.6 18 4.9 18 4.9c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z"/></svg>',
    scholar: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3 1 8.5l11 5.5 9-4.5V16h2V8.5L12 3zM4 13.2V17c0 1.7 3.6 3 8 3s8-1.3 8-3v-3.8l-8 4-8-4z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    paper: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
    arxiv: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/></svg>',
    hf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/></svg>',
    wechat: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.6 3C4.8 3 1.7 5.5 1.7 8.6c0 1.8 1 3.4 2.6 4.5l-.8 2.2 2.5-1.3c.7.2 1.5.3 2.2.3h.5a5.3 5.3 0 0 1-.2-1.4c0-3.2 3.1-5.8 6.9-5.8h.6C15.3 4.7 12.3 3 8.6 3zM6.2 6.1a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm4.9 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/><path d="M22.3 13c0-2.7-2.7-4.9-6-4.9s-6 2.2-6 4.9 2.7 4.9 6 4.9c.7 0 1.4-.1 2.1-.3l2 1-.5-1.8c1.5-.9 2.4-2.3 2.4-3.8zm-8-1.4a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8zm4.1 0a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8z"/></svg>',
    demo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>'
  };
  function icon(name) { return ICONS[name] || ICONS.arxiv; }

  /* ---------- Small helpers ---------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  var SELF = [];
  function boldSelf(str) {
    if (!str) return "";
    var out = str;
    SELF.forEach(function (name) {
      if (!name) return;
      var re = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
      out = out.replace(re, "<strong>" + name + "</strong>");
    });
    return out;
  }

  /* ---------- State ---------- */
  var META = null;
  var DATA = null;
  var lang = document.documentElement.getAttribute("lang") || "en";
  if (lang !== "en" && lang !== "zh") lang = "en";

  var VER = "9";

  /* ---------- Load + render ---------- */
  function boot() {
    fetch("./data/meta.json?v=" + VER)
      .then(function (r) { return r.json(); })
      .then(function (meta) {
        META = meta;
        SELF = meta.self || [];
        if (!document.documentElement.getAttribute("lang")) {
          lang = meta.defaultLanguage || "en";
        }
        return loadLang(lang);
      })
      .catch(function (e) {
        document.body.innerHTML =
          '<p style="padding:3rem;font-family:monospace">Failed to load content. Serve this folder over HTTP (e.g. <code>python3 -m http.server</code>) — opening index.html directly blocks fetch().</p>';
        console.error(e);
      });
  }

  function loadLang(l) {
    return fetch("./data/" + l + ".json?v=" + VER)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        DATA = data;
        lang = l;
        document.documentElement.setAttribute("lang", l);
        render();
      });
  }

  function render() {
    document.title = DATA.docTitle;
    renderChrome();
    renderHero();
    renderAbout();
    renderNews();
    renderTechReport();
    renderPublications();
    renderExperience();
    renderEducation();
    renderHonors();
    renderContact();
    renderFooter();
    setupReveal();
    setupScrollSpy();
  }

  /* ---------- Nav / chrome text ---------- */
  function renderChrome() {
    $all("[data-nav]").forEach(function (n) {
      var k = n.getAttribute("data-nav");
      if (DATA.nav[k]) n.textContent = DATA.nav[k];
    });
    $("[data-ui='langLabel']").textContent = DATA.ui.langLabel;
    var tt = $("#themeToggle");
    tt.setAttribute("aria-label",
      document.documentElement.getAttribute("data-theme") === "dark" ? DATA.ui.themeToLight : DATA.ui.themeToDark);
  }

  /* ---------- Hero ---------- */
  function renderHero() {
    var h = DATA.hero;
    $("[data-hero='eyebrow']").textContent = h.eyebrow;
    $("[data-hero='name']").textContent = h.name;
    $("[data-hero='cnName']").textContent = h.cnName;
    $("[data-hero='tagline']").textContent = h.tagline;
    $("[data-hero='affiliation']").textContent = h.affiliation;
    $("[data-hero='location']").textContent = h.location;

    var kw = $("#heroKeywords");
    kw.innerHTML = "";
    h.keywords.forEach(function (k, i) {
      var li = el("li", null, k);
      li.style.setProperty("--i", i);
      kw.appendChild(li);
    });

    var p = $("#ctaPrimary"), s = $("#ctaSecondary");
    p.textContent = h.ctaPrimary.label; p.setAttribute("href", "#" + h.ctaPrimary.target);
    s.textContent = h.ctaSecondary.label; s.setAttribute("href", "#" + h.ctaSecondary.target);

    var soc = $("#heroSocials");
    soc.innerHTML = "";
    (META.socials || []).forEach(function (sc) {
      var a = el("a", null, icon(sc.icon));
      a.href = sc.url;
      a.setAttribute("aria-label", sc.label);
      a.title = sc.label;
      if (sc.url.indexOf("mailto:") !== 0) { a.target = "_blank"; a.rel = "noopener"; }
      if (!sc.url || sc.url === "#") { a.classList.add("is-todo"); a.removeAttribute("target"); }
      soc.appendChild(a);
    });

    if (META.avatar) $("#avatarImg").src = META.avatar;
    $("#avatarImg").alt = h.name;
  }

  /* ---------- Section head builder ---------- */
  function head(block, data) {
    var h = el("div", "sec-head reveal");
    h.appendChild(el("span", "sec-kicker", data.kicker || ""));
    h.appendChild(el("h2", "sec-title", data.title));
    if (data.note) h.appendChild(el("p", "sec-note", data.note));
    block.appendChild(h);
  }

  function renderAbout() {
    var b = $("#aboutBlock"); b.innerHTML = "";
    head(b, DATA.about);
    var grid = el("div", "about-grid reveal");
    DATA.about.paragraphs.forEach(function (p) { grid.appendChild(el("p", null, p)); });
    b.appendChild(grid);
  }

  function renderNews() {
    var b = $("#newsBlock"); b.innerHTML = "";
    head(b, DATA.news);
    var list = el("ul", "news-list reveal");
    DATA.news.items.forEach(function (n) {
      var li = el("li", "news-item");
      li.appendChild(el("time", null, n.date));
      li.appendChild(el("p", null, n.content));
      list.appendChild(li);
    });
    b.appendChild(list);
  }

  /* ---------- Publication / tech-report card ---------- */
  function buildCard(p, featured) {
    var c = el("article", "card reveal" + (featured ? " card--featured" : ""));

    if (p.image) {
      var fig = el("figure", "card__figure");
      var img = el("img", null);
      img.src = p.image;
      img.alt = p.title;
      img.loading = "lazy";
      fig.appendChild(img);
      if (p.badge) fig.appendChild(el("span", "card__badge", p.badge));
      c.appendChild(fig);
    }

    var body = el("div", "card__body");

    var top = el("div", "card__top");
    top.appendChild(el("h3", "card__title", p.title));
    if (p.year) top.appendChild(el("span", "card__year", p.year));
    body.appendChild(top);

    var venue = el("div", "card__venue");
    venue.appendChild(el("span", null, p.venue));
    if (p.highlight) venue.appendChild(el("span", "card__highlight", "· " + p.highlight));
    if (p.role) {
      var star = /co-first|共同|共一/i.test(p.role);
      venue.appendChild(el("span", "card__role" + (star ? " card__role--star" : ""), "· " + p.role));
    }
    body.appendChild(venue);

    var au = boldSelf(p.authors);
    if (p.authorsNote) au += ' <span class="card__eq">' + p.authorsNote + "</span>";
    body.appendChild(el("p", "card__authors", au));
    body.appendChild(el("p", "card__desc", p.description));

    if (p.tags && p.tags.length) {
      var tags = el("div", "tags");
      p.tags.forEach(function (t) { tags.appendChild(el("span", "tag", t)); });
      body.appendChild(tags);
    }

    if (p.links && p.links.length) {
      var links = el("div", "links");
      p.links.forEach(function (lk) {
        var a = el("a", "link-btn", icon(lk.icon) + "<span>" + lk.label + "</span>");
        a.href = lk.url || "#";
        if (!lk.url || lk.url === "#") a.classList.add("is-todo");
        else { a.target = "_blank"; a.rel = "noopener"; }
        links.appendChild(a);
      });
      body.appendChild(links);
    }

    c.appendChild(body);
    return c;
  }

  function renderTechReport() {
    var b = $("#techReportBlock"); b.innerHTML = "";
    if (!DATA.techReport || !DATA.techReport.items || !DATA.techReport.items.length) return;
    head(b, DATA.techReport);
    var wrap = el("div", "cards cards--feature");
    DATA.techReport.items.forEach(function (p) { wrap.appendChild(buildCard(p, true)); });
    b.appendChild(wrap);
    if (finePointer && !reduceMotion) attachTilt(wrap);
  }

  function renderPublications() {
    var b = $("#publicationsBlock"); b.innerHTML = "";
    head(b, DATA.publications);
    var wrap = el("div", "cards");
    DATA.publications.items.forEach(function (p) { wrap.appendChild(buildCard(p, false)); });
    b.appendChild(wrap);
    if (finePointer && !reduceMotion) attachTilt(wrap);
  }

  /* ---------- Timeline bullet (supports nesting + "next" flag) ---------- */
  function buildPoint(pt) {
    if (typeof pt === "string") return el("li", null, pt);
    var li = el("li", pt.next ? "is-next" : null, pt.text);
    if (pt.sub && pt.sub.length) {
      var sub = el("ul", "tl-subpoints");
      pt.sub.forEach(function (s) { sub.appendChild(buildPoint(s)); });
      li.appendChild(sub);
    }
    return li;
  }

  function renderExperience() {
    var b = $("#experienceBlock"); b.innerHTML = "";
    head(b, DATA.experience);
    var tl = el("div", "timeline reveal");
    DATA.experience.items.forEach(function (it) {
      var item = el("div", "tl-item");
      item.appendChild(el("div", "tl-date", it.date));
      item.appendChild(el("div", "tl-role", it.role));
      item.appendChild(el("div", "tl-org",
        it.org + (it.location ? ' <span class="loc">· ' + it.location + "</span>" : "")));
      if (it.points && it.points.length) {
        var ul = el("ul", "tl-points");
        it.points.forEach(function (pt) { ul.appendChild(buildPoint(pt)); });
        item.appendChild(ul);
      }
      tl.appendChild(item);
    });
    b.appendChild(tl);
  }

  function renderEducation() {
    var b = $("#educationBlock"); b.innerHTML = "";
    head(b, DATA.education);
    var tl = el("div", "timeline reveal");
    DATA.education.items.forEach(function (it) {
      var item = el("div", "tl-item");
      item.appendChild(el("div", "tl-date", it.date));
      item.appendChild(el("div", "tl-role", it.degree));
      item.appendChild(el("div", "tl-org", it.school));
      if (it.detail) item.appendChild(el("p", "tl-detail", it.detail));
      tl.appendChild(item);
    });
    b.appendChild(tl);
  }

  function renderHonors() {
    var b = $("#honorsBlock"); b.innerHTML = "";
    head(b, DATA.honors);
    var grid = el("div", "honors-grid reveal");
    DATA.honors.items.forEach(function (it) {
      var card = el("div", "honor");
      card.appendChild(el("span", "honor__year", it.year));
      card.appendChild(el("span", "honor__title", it.title));
      grid.appendChild(card);
    });
    b.appendChild(grid);
  }

  function renderContact() {
    var b = $("#contactBlock"); b.innerHTML = "";
    head(b, DATA.contact);
    var card = el("div", "contact-card reveal");
    card.appendChild(el("p", null, DATA.contact.text));
    var a = el("a", "contact-mail", icon("mail") + "<span>" + DATA.contact.email + "</span>");
    a.href = "mailto:" + DATA.contact.email;
    card.appendChild(a);
    b.appendChild(card);
  }

  function renderFooter() {
    $("[data-footer='copyright']").textContent = DATA.footer.copyright;
  }

  /* ---------- Scroll reveal (staggered) ---------- */
  var revealObserver = null;
  function setupReveal() {
    if (reduceMotion) { $all(".reveal").forEach(function (n) { n.classList.add("is-in"); }); return; }
    if (revealObserver) revealObserver.disconnect();
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var target = e.target;
          // stagger direct children if it's a list/grid
          var kids = $all(":scope > *", target);
          if (kids.length > 1 && (target.classList.contains("cards") ||
              target.classList.contains("timeline") || target.classList.contains("news-list") ||
              target.classList.contains("honors-grid") || target.classList.contains("about-grid"))) {
            kids.forEach(function (k, i) {
              k.style.transition = "opacity .6s var(--ease) " + (i * 70) + "ms, transform .6s var(--ease) " + (i * 70) + "ms";
              k.style.opacity = "0"; k.style.transform = "translateY(18px)";
              requestAnimationFrame(function () {
                requestAnimationFrame(function () { k.style.opacity = ""; k.style.transform = ""; });
              });
            });
          }
          target.classList.add("is-in");
          revealObserver.unobserve(target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    $all(".reveal").forEach(function (n) { revealObserver.observe(n); });
  }

  /* ---------- Card 3D tilt ---------- */
  function attachTilt(wrap) {
    $all(".card", wrap).forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = "translateY(-4px) rotateX(" + (-py * 4).toFixed(2) + "deg) rotateY(" + (px * 5).toFixed(2) + "deg)";
        card.style.setProperty("--mx", (px * 100 + 50) + "%");
      });
      card.addEventListener("mouseleave", function () { card.style.transform = ""; });
    });
  }

  /* ---------- Scroll spy ---------- */
  function setupScrollSpy() {
    var links = $all(".nav__links a");
    var map = {};
    links.forEach(function (a) {
      var id = a.getAttribute("href").slice(1);
      var sec = document.getElementById(id);
      if (sec) map[id] = a;
    });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          links.forEach(function (a) { a.classList.remove("is-active"); });
          if (map[e.target.id]) map[e.target.id].classList.add("is-active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(map).forEach(function (id) { spy.observe(document.getElementById(id)); });
  }

  /* ---------- Toggles: theme + language ---------- */
  function setupToggles() {
    $("#themeToggle").addEventListener("click", function () {
      var cur = document.documentElement.getAttribute("data-theme");
      var next = cur === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
      if (DATA) this.setAttribute("aria-label", next === "dark" ? DATA.ui.themeToLight : DATA.ui.themeToDark);
    });

    $("#langToggle").addEventListener("click", function () {
      var next = lang === "en" ? "zh" : "en";
      try { localStorage.setItem("lang", next); } catch (e) {}
      loadLang(next);
      closeMenu();
    });
  }

  /* ---------- Mobile menu ---------- */
  function closeMenu() {
    $("#navLinks").classList.remove("is-open");
    $("#navBurger").setAttribute("aria-expanded", "false");
  }
  function setupMenu() {
    var burger = $("#navBurger"), links = $("#navLinks");
    burger.addEventListener("click", function () {
      var open = links.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.addEventListener("click", function (e) { if (e.target.tagName === "A") closeMenu(); });
  }

  /* ---------- Nav shadow + back-to-top ---------- */
  function setupScrollChrome() {
    var nav = $("#nav"), toTop = $("#toTop");
    function onScroll() {
      var y = window.scrollY;
      nav.classList.toggle("is-scrolled", y > 8);
      toTop.classList.toggle("is-visible", y > 600);
      // hero glow parallax
      var g1 = $(".bg-glow--1"), g2 = $(".bg-glow--2");
      if (g1 && !reduceMotion) { g1.style.transform = "translateY(" + (y * 0.06) + "px)"; }
      if (g2 && !reduceMotion) { g2.style.transform = "translateY(" + (y * -0.04) + "px)"; }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Cursor spotlight (desktop) ---------- */
  function setupSpotlight() {
    if (!finePointer || reduceMotion) return;
    var dot = el("div", "cursor-glow");
    dot.setAttribute("aria-hidden", "true");
    document.body.appendChild(dot);
    var tx = 0, ty = 0, cx = 0, cy = 0;
    document.addEventListener("mousemove", function (e) { tx = e.clientX; ty = e.clientY; });
    (function loop() {
      cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18;
      dot.style.transform = "translate(" + cx + "px," + cy + "px)";
      requestAnimationFrame(loop);
    })();
  }

  /* ---------- Buttery smooth scroll (desktop only) ---------- */
  var NAV_OFFSET = 72;
  function setupSmoothScroll() {
    // Placeholder links (href="#") must never jump to the top — guard globally
    // (covers anchors created dynamically after this runs).
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[href="#"]');
      if (a) e.preventDefault();
    });

    // In-page anchor easing works everywhere via native smooth scroll.
    $all('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href");
        if (id === "#" || id === "#top") { e.preventDefault(); window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }); return; }
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        var top = target.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
        window.scrollTo({ top: top, behavior: reduceMotion ? "auto" : "smooth" });
      });
    });
  }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    setupToggles();
    setupMenu();
    setupScrollChrome();
    setupSpotlight();
    setupSmoothScroll();
    boot();
  });
})();
