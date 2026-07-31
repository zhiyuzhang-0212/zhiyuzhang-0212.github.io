# Zhiyu Zhang — Personal Website

A hand-built, config-driven academic homepage. Dark-first with a light/dark toggle,
bilingual (EN / 中文), fully responsive, no build step — just static files.

> Inspired by the structure of academic homepages, but written from scratch: custom
> HTML/CSS/JS, no template code reused.

## Structure

```
personal-website/
├── index.html              # page shell (nav, section containers, footer)
├── assets/
│   ├── css/style.css        # design system: theming, layout, cards, animations
│   ├── js/main.js           # renders content, theme + language toggles, motion
│   └── img/portrait.png     # hero avatar (swap with your own square image)
└── data/
    ├── meta.json            # shared config: avatar, socials, accent colors, self-name
    ├── en.json              # all English content
    └── zh.json              # all Chinese content
```

## Editing content

**You almost never touch HTML/CSS.** Update the JSON files under `data/`:

- `data/en.json` / `data/zh.json` — every section's text (hero, about, news,
  publications, experience, education, honors, contact). The two files share the same
  shape; keep them in sync.
- `data/meta.json` — avatar path, social links, accent colours, and `self` (names to
  auto-bold in author lists).

### Publication / social links
Link buttons whose `url` is `"#"` render greyed-out with a **TODO** badge. Replace the
`#` with the real URL (arXiv / GitHub / Hugging Face / demo) to activate them.

Content lives in two section groups: `techReport` (MOVA, the featured card) and
`publications` (the four papers). Each item supports `image` (figure path), `authors`
(use `<sup>∗</sup>` for equal contribution), `authorsNote`, `role` (badge — "Co-first
author" is auto-highlighted), `highlight` (bold accent text right after the venue, used
for MOVA's "Core contributor"), `badge` (ribbon on the figure, currently unused) and
`links`.

**Only remaining TODO:** `meta.json` → Google Scholar URL. Every other link is live and
HTTP-verified. The Scholar icon renders greyed-out until a real profile URL is supplied
(or delete that entry from `socials` if there is no profile).

Link `icon` values map to built-in SVGs: `github`, `scholar`, `mail`, `paper`,
`arxiv`, `hf`, `demo`.

Timeline `points` in `experience` accept either a plain string or an object:
`{ "text": "...", "sub": ["...", "..."], "next": true }` — `sub` renders an indented
nested list, `next` marks the bullet as upcoming work (accent colour, ◆ glyph).

### Swapping the avatar
Drop a square image at `assets/img/` and point `meta.json → "avatar"` at it. It renders
in a circular, animated gradient ring.

## Run locally

`fetch()` needs HTTP (opening `index.html` via `file://` is blocked by the browser):

```bash
cd personal-website
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy to GitHub Pages

1. Create a repo (for a user site, name it `<username>.github.io`; otherwise any repo works).
2. Put the **contents of `personal-website/`** at the repo root (so `index.html` is at
   the top level), commit and push.
3. Repo **Settings → Pages → Build and deployment → Source: Deploy from a branch**,
   pick `main` / `/ (root)`, save.
4. Live at `https://<username>.github.io/` (or `.../<repo>/`) within a minute.

No build tooling required — GitHub Pages serves the static files as-is.

## Notes

- Fonts load from Google Fonts with a system-font fallback, so the page still renders
  cleanly if the CDN is blocked.
- Motion (scroll-reveal, cursor glow, card tilt, spinning avatar ring) is automatically
  disabled when the visitor has `prefers-reduced-motion` set.
- Themes and language choice persist in `localStorage`; first visit follows the OS
  `prefers-color-scheme`.
