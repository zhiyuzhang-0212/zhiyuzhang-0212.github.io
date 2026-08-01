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
    github: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>',
    scholar: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5.242 13.769L0 9.5 12 0l12 9.5-5.242 4.269C17.548 11.249 14.978 9.5 12 9.5c-2.977 0-5.548 1.748-6.758 4.269zM12 10a7 7 0 1 0 0 14 7 7 0 0 0 0-14z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    paper: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>',
    arxiv: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3.8423 0a1.0037 1.0037 0 0 0-.922.6078c-.1536.3687-.0438.6275.2938 1.1113l6.9185 8.3597-1.0223 1.1058a1.0393 1.0393 0 0 0 .003 1.4229l1.2292 1.3135-5.4391 6.4444c-.2803.299-.4538.823-.2971 1.1986a1.0253 1.0253 0 0 0 .9585.635.9133.9133 0 0 0 .6891-.3405l5.783-6.126 7.4902 8.0051a.8527.8527 0 0 0 .6835.2597.9575.9575 0 0 0 .8777-.6138c.1577-.377-.017-.7502-.306-1.1407l-7.0518-8.3418 1.0632-1.13a.9626.9626 0 0 0 .0089-1.3165L4.6336.4639s-.3733-.4535-.768-.463zm0 .272h.0166c.2179.0052.4874.2715.5644.3639l.005.006.0052.0055 10.169 10.9905a.6915.6915 0 0 1-.0072.945l-1.0666 1.133-1.4982-1.7724-8.5994-10.39c-.3286-.472-.352-.6183-.2592-.841a.7307.7307 0 0 1 .6704-.4401Zm14.341 1.5701a.877.877 0 0 0-.6554.2418l-5.6962 6.1584 1.6944 1.8319 5.3089-6.5138c.3251-.4335.479-.6603.3247-1.0292a1.1205 1.1205 0 0 0-.9763-.689zm-7.6557 12.2823 1.3186 1.4135-5.7864 6.1295a.6494.6494 0 0 1-.4959.26.7516.7516 0 0 1-.706-.4669c-.1119-.2682.0359-.6864.2442-.9083l.0051-.0055.0047-.0055z"/></svg>',
    hf: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.025 1.13c-5.77 0-10.449 4.647-10.449 10.378 0 1.112.178 2.181.503 3.185.064-.222.203-.444.416-.577a.96.96 0 0 1 .524-.15c.293 0 .584.124.84.284.278.173.48.408.71.694.226.282.458.611.684.951v-.014c.017-.324.106-.622.264-.874s.403-.487.762-.543c.3-.047.596.06.787.203s.31.313.4.467c.15.257.212.468.233.542.01.026.653 1.552 1.657 2.54.616.605 1.01 1.223 1.082 1.912.055.537-.096 1.059-.38 1.572.637.121 1.294.187 1.967.187.657 0 1.298-.063 1.921-.178-.287-.517-.44-1.041-.384-1.581.07-.69.465-1.307 1.081-1.913 1.004-.987 1.647-2.513 1.657-2.539.021-.074.083-.285.233-.542.09-.154.208-.323.4-.467a1.08 1.08 0 0 1 .787-.203c.359.056.604.29.762.543s.247.55.265.874v.015c.225-.34.457-.67.683-.952.23-.286.432-.52.71-.694.257-.16.547-.284.84-.285a.97.97 0 0 1 .524.151c.228.143.373.388.43.625l.006.04a10.3 10.3 0 0 0 .534-3.273c0-5.731-4.678-10.378-10.449-10.378M8.327 6.583a1.5 1.5 0 0 1 .713.174 1.487 1.487 0 0 1 .617 2.013c-.183.343-.762-.214-1.102-.094-.38.134-.532.914-.917.71a1.487 1.487 0 0 1 .69-2.803m7.486 0a1.487 1.487 0 0 1 .689 2.803c-.385.204-.536-.576-.916-.71-.34-.12-.92.437-1.103.094a1.487 1.487 0 0 1 .617-2.013 1.5 1.5 0 0 1 .713-.174m-10.68 1.55a.96.96 0 1 1 0 1.921.96.96 0 0 1 0-1.92m13.838 0a.96.96 0 1 1 0 1.92.96.96 0 0 1 0-1.92M8.489 11.458c.588.01 1.965 1.157 3.572 1.164 1.607-.007 2.984-1.155 3.572-1.164.196-.003.305.12.305.454 0 .886-.424 2.328-1.563 3.202-.22-.756-1.396-1.366-1.63-1.32q-.011.001-.02.006l-.044.026-.01.008-.03.024q-.018.017-.035.036l-.032.04a1 1 0 0 0-.058.09l-.014.025q-.049.088-.11.19a1 1 0 0 1-.083.116 1.2 1.2 0 0 1-.173.18q-.035.029-.075.058a1.3 1.3 0 0 1-.251-.243 1 1 0 0 1-.076-.107c-.124-.193-.177-.363-.337-.444-.034-.016-.104-.008-.2.022q-.094.03-.216.087-.06.028-.125.063l-.13.074q-.067.04-.136.086a3 3 0 0 0-.135.096 3 3 0 0 0-.26.219 2 2 0 0 0-.12.121 2 2 0 0 0-.106.128l-.002.002a2 2 0 0 0-.09.132l-.001.001a1.2 1.2 0 0 0-.105.212q-.013.036-.024.073c-1.139-.875-1.563-2.317-1.563-3.203 0-.334.109-.457.305-.454m.836 10.354c.824-1.19.766-2.082-.365-3.194-1.13-1.112-1.789-2.738-1.789-2.738s-.246-.945-.806-.858-.97 1.499.202 2.362c1.173.864-.233 1.45-.685.64-.45-.812-1.683-2.896-2.322-3.295s-1.089-.175-.938.647 2.822 2.813 2.562 3.244-1.176-.506-1.176-.506-2.866-2.567-3.49-1.898.473 1.23 2.037 2.16c1.564.932 1.686 1.178 1.464 1.53s-3.675-2.511-4-1.297c-.323 1.214 3.524 1.567 3.287 2.405-.238.839-2.71-1.587-3.216-.642-.506.946 3.49 2.056 3.522 2.064 1.29.33 4.568 1.028 5.713-.624m5.349 0c-.824-1.19-.766-2.082.365-3.194 1.13-1.112 1.789-2.738 1.789-2.738s.246-.945.806-.858.97 1.499-.202 2.362c-1.173.864.233 1.45.685.64.451-.812 1.683-2.896 2.322-3.295s1.089-.175.938.647-2.822 2.813-2.562 3.244 1.176-.506 1.176-.506 2.866-2.567 3.49-1.898-.473 1.23-2.037 2.16c-1.564.932-1.686 1.178-1.464 1.53s3.675-2.511 4-1.297c.323 1.214-3.524 1.567-3.287 2.405.238.839 2.71-1.587 3.216-.642.506.946-3.49 2.056-3.522 2.064-1.29.33-4.568 1.028-5.713-.624"/></svg>',
    wechat: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/></svg>',
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

  var VER = "33";

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
    renderBrowsing();
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

    var tagsEl = null;
    if (p.tags && p.tags.length) {
      tagsEl = el("div", "tags");
      p.tags.forEach(function (t) { tagsEl.appendChild(el("span", "tag", t)); });
    }

    if (p.image) {
      var fig = el("figure", "card__figure");
      var img = el("img", null);
      img.src = p.image;
      img.alt = p.title;
      img.loading = "lazy";
      fig.appendChild(img);
      if (p.badge) fig.appendChild(el("span", "card__badge", p.badge));
      if (tagsEl) fig.appendChild(tagsEl);
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

    if (tagsEl && !p.image) body.appendChild(tagsEl);

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

  /* ---------- Browsing log (visitor lights map) ---------- */
  function renderBrowsing() {
    var b = $("#browsingBlock"); if (!b) return;
    b.innerHTML = "";
    if (!DATA.browsingLog) return;
    head(b, DATA.browsingLog);
    var wrap = el("div", "map-wrap reveal");
    var stage = el("div", "map-stage");
    var canvas = document.createElement("canvas");
    canvas.className = "map-canvas";
    canvas.setAttribute("aria-hidden", "true");
    var count = el("div", "map-count");
    stage.appendChild(canvas);
    stage.appendChild(count);
    wrap.appendChild(stage);
    b.appendChild(wrap);
    if (window.VisitorMap) {
      window.VisitorMap.mount({
        canvas: canvas,
        count: count,
        endpoint: (META && META.browsingApi) || "",
        labels: DATA.browsingLog.labels || {},
      });
    }
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
