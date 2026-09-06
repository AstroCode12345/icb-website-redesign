/**
 * Generate the static site from content/.
 *
 *   content/site.json   nav, footer, brand: everything shared by every page
 *   content/pages.json  one entry per URL: head metadata, hero, and blocks
 *
 * The portal writes those two files; this turns them into the HTML that ships.
 * Rendering here rather than in the browser keeps the pages statically
 * indexable, which matters for a mosque people find by searching for prayer
 * times, and avoids a flash of empty content on load.
 *
 *   node build.js          write the site
 *   node build.js --check  render to memory and report, writing nothing
 */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const ASSET_V = process.env.ASSET_V || readAssetVersion();

const site = readJSON("content/site.json");
const pages = readJSON("content/pages.json");

function readJSON(p) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
}

/** Reuse whatever ?v= the current pages carry, so a build is not a cache bust. */
function readAssetVersion() {
  const m = fs.readFileSync(path.join(ROOT, "index.html"), "utf8")
    .match(/styles\.css\?v=([0-9a-z]+)/);
  return m ? m[1] : "1";
}

const esc = s => String(s ?? "").replace(/&(?![a-zA-Z#][a-zA-Z0-9]*;)/g, "&amp;")
  .replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Content fields hold trusted inline markup (links, <strong>) from the portal. */
const html = s => String(s ?? "");

const attr = (name, val) => (val ? ` ${name}="${esc(val)}"` : "");

/* ── Icons ── */
const ICONS = readJSON("tools/icons.json");
function icon(name, size = 22, stroke = 2) {
  const body = ICONS[name];
  if (!body) return "";
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" `
    + `stroke="currentColor" stroke-width="${stroke}">${body}</svg>`;
}
const ARROW = icon("arrow-right", 16, 2.5);

/* ── Blocks ── */

function renderBlocks(blocks, indent = "      ") {
  return (blocks || []).map(b => renderBlock(b, indent)).filter(Boolean).join("\n");
}

/** data-* attributes, re-emitted verbatim so content.js can still find them. */
function dataAttrs(b) {
  return Object.entries(b.data || {})
    .map(([k, v]) => (v === "" ? ` ${k}` : ` ${k}="${esc(v)}"`)).join("");
}

function renderBlock(b, ind) {
  switch (b.type) {
    case "prose": return prose(b, ind);
    case "text": return textBlock(b, ind);
    case "heading": return heading(b, ind);
    case "group": return group(b, ind);
    case "table": return table(b, ind);
    case "infocards": return cards(b, ind, "info");
    case "navcards": return cards(b, ind, "nav");
    case "quicklinks": return quicklinks(b, ind);
    case "cta": return cta(b, ind);
    case "faq": return faq(b, ind);
    case "tabbar": return tabbar(b, ind);
    case "tabpanel": return tabpanel(b, ind);
    case "embed": return embed(b, ind);
    case "dynamic": return dynamic(b, ind);
    case "icon": return `${ind}${icon(b.name)}`;
    case "decor": return `${ind}<div${attr("class", b.class)}></div>`;
    case "form": return `${ind}${b.html}`;
    case "raw": return `${ind}${b.html}`;
    default: return "";
  }
}

function wrapAttrs(b) {
  let style = b.style || "";
  if (b.narrow && !style) style = "max-width:760px;margin-inline:auto;";
  if (b.align === "center" && !/text-align/.test(style)) style += "text-align:center;";
  return attr("class", b.class) + attr("style", style);
}

function prose(b, ind) {
  const parts = (b.parts || []).map(p => {
    if (p.t === "p") return `${ind}  <p>${html(p.text)}</p>`;
    if (p.t === "label") return `${ind}  <span class="section__label">${html(p.text)}</span>`;
    if (p.t === "heading") return `${ind}  <${p.level}>${html(p.text)}</${p.level}>`;
    if (p.t === "img") return `${ind}  <img src="${esc(p.src)}" alt="${esc(p.alt)}">`;
    if (p.t === "list") {
      const tag = p.ordered ? "ol" : "ul";
      const items = (p.items || []).map(i => `${ind}    <li>${html(i)}</li>`).join("\n");
      return `${ind}  <${tag}>\n${items}\n${ind}  </${tag}>`;
    }
    if (p.t === "raw") return `${ind}  ${p.html}`;
    return "";
  }).filter(Boolean).join("\n");
  if (!parts) return "";
  const a = attr("id", b.id) + wrapAttrs(b) + dataAttrs(b);
  return a ? `${ind}<div${a}>\n${parts}\n${ind}</div>` : parts;
}

/** One element, rendered with its own tag, class, style and data binding. */
function textBlock(b, ind) {
  const tag = b.tag || "p";
  const src = tag === "img"
    ? ` src="${esc(b.src)}" alt="${esc(b.alt || "")}"` : "";
  const a = attr("id", b.id) + attr("class", b.class) + attr("style", b.style)
    + src + dataAttrs(b);
  const VOID = { br: 1, img: 1, hr: 1, input: 1 };
  if (VOID[tag]) return `${ind}<${tag}${a}>`;
  return `${ind}<${tag}${a}>${html(b.html)}</${tag}>`;
}

function heading(b, ind) {
  const lvl = b.level || "h2";
  const label = b.label
    ? `${ind}  <span class="section__label">${html(b.label)}</span>\n` : "";
  const title = b.title
    ? `${ind}  <${lvl} class="section__title">${html(b.title)}</${lvl}>\n` : "";
  if (!b.label && b.level && !b.sub) return `${ind}<${lvl}${attr("id", b.id)}>${html(b.title)}</${lvl}>`;
  const sub = (b.sub || []).map(x => typeof x === "string"
    ? `${ind}  <p>${html(x)}</p>\n`
    : `${ind}  <p${attr("class", x.class)}>${html(x.text)}</p>\n`).join("");
  return `${ind}<div class="section__header"${attr("style", b.style)}>\n${label}${title}${sub}${ind}</div>`;
}

const LAYOUT_CLASS = { plain: "", "nav-card-grid": "nav-card-grid" };

function group(b, ind) {
  const cls = b.class || (b.layout in LAYOUT_CLASS ? LAYOUT_CLASS[b.layout] : b.layout);
  const inner = renderBlocks(b.blocks, ind + "  ");
  if (!inner) return "";
  const a = attr("id", b.id) + attr("class", cls) + attr("style", b.style) + dataAttrs(b);
  return a ? `${ind}<div${a}>\n${inner}\n${ind}</div>` : inner;
}

function table(b, ind) {
  const cell = (c, tag) => typeof c === "string"
    ? `<${tag}>${html(c)}</${tag}>`
    : `<${tag}${dataAttrs(c)}>${html(c.html)}</${tag}>`;
  const head = b.columns
    ? `${ind}  <thead><tr>${b.columns.map(c => cell(c, "th")).join("")}</tr></thead>\n`
    : "";
  const rows = (b.rows || []).map(r =>
    `${ind}    <tr>${r.map(c => cell(c, "td")).join("")}</tr>`).join("\n");
  const cls = (b.style === "prayer" ? ' class="prayer-table"' : "") + dataAttrs(b);
  const bind = b.bind && b.bind.startsWith("schoolDates:")
    ? ` data-school-dates="${esc(b.bind.split(":")[1])}"` : "";
  const bodyAttrs = dataAttrs({ data: b.bodyData });
  return `${ind}<table${cls}${bind}>\n${head}${ind}  <tbody${bodyAttrs}>\n${rows}\n${ind}  </tbody>\n${ind}</table>`;
}

function cards(b, ind, kind) {
  const items = (b.items || []).map(it => {
    const ic = it.icon
      ? `${ind}    <div class="${kind}-card__icon">${icon(it.icon)}</div>\n` : "";
    const title = it.title
      ? `${ind}    <h3 class="${kind}-card__title">${html(it.title)}</h3>\n` : "";
    const bodies = [it.body, ...(it.extraBody || [])].filter(Boolean);
    const body = bodies
      .map(x => `${ind}    <p class="${kind}-card__body">${html(x)}</p>\n`).join("");
    const extra = it.blocks ? renderBlocks(it.blocks, ind + "    ") + "\n" : "";
    if (kind === "nav") {
      const ext = it.external ? ' target="_blank" rel="noopener"' : "";
      const label = it.cta || "Read more";
      const arrow = `${ind}    <span class="nav-card__arrow">${html(label)} ${ARROW}</span>\n`;
      return `${ind}  <a href="${esc(it.href)}" class="nav-card"${ext}>\n${ic}${title}${body}${extra}${arrow}${ind}  </a>`;
    }
    return `${ind}  <div class="info-card">\n${ic}${title}${body}${extra}${ind}  </div>`;
  }).join("\n");
  if (!items) return "";
  // A lone card keeps its own wrapper from the parent group; a set gets a grid.
  if ((b.items || []).length === 1) return items;
  const grid = b.gridClass || (kind === "nav" ? "nav-card-grid" : "info-grid");
  return `${ind}<div class="${esc(grid)}">\n${items}\n${ind}</div>`;
}

function quicklinks(b, ind) {
  const items = (b.items || []).map(it =>
    `${ind}  <a class="quicklink" href="${esc(it.href)}">\n`
    + (it.icon ? `${ind}    <div class="quicklink__icon">${icon(it.icon)}</div>\n` : "")
    + `${ind}    <span class="quicklink__label">${html(it.label)}</span>\n`
    + `${ind}    <span class="quicklink__go">${ARROW}</span>\n`
    + `${ind}  </a>`).join("\n");
  if (!items) return "";
  if ((b.items || []).length === 1) return items;
  return `${ind}<div class="quicklinks">\n${items}\n${ind}</div>`;
}

function cta(b, ind) {
  const ext = b.external ? ' target="_blank" rel="noopener"' : "";
  if (b.variant === "link") {
    const st = b.style || "color:var(--green-700);font-weight:600;";
    return `${ind}<a href="${esc(b.href)}"${ext}${attr("class", b.class)} style="${esc(st)}"${dataAttrs(b)}>${html(b.label)}</a>`;
  }
  const cls = b.class || "btn btn--outline";
  return `${ind}<a class="${esc(cls)}" href="${esc(b.href)}"${ext}${dataAttrs(b)}>${html(b.label)}</a>`;
}

function faq(b, ind) {
  if (b.variant === "details") {
    const items = (b.items || []).map(it =>
      `${ind}  <details${attr("class", b.itemClass)}>\n`
      + `${ind}    <summary>${html(it.q)}</summary>\n`
      + `${ind}    <p>${html(it.a)}</p>\n`
      + `${ind}  </details>`).join("\n");
    return `${ind}<div${attr("class", b.listClass || "faq-list")}>\n${items}\n${ind}</div>`;
  }
  return (b.items || []).map(it =>
    `${ind}<div class="faq-item">\n`
    + `${ind}  <h3 class="faq-item__q">${html(it.q)}</h3>\n`
    + `${ind}  <p class="faq-item__a">${html(it.a)}</p>\n`
    + `${ind}</div>`).join("\n");
}

function tabbar(b, ind) {
  const btns = (b.tabs || []).map((t, i) =>
    `${ind}  <button class="tab-btn${i === 0 ? " active" : ""}"${dataAttrs(t)} role="tab"`
    + `${attr("id", t.btnId)} aria-selected="${i === 0}"`
    + ` aria-controls="${esc(t.controls || t.id)}">${html(t.label)}</button>`).join("\n");
  return `${ind}<div class="tab-bar" role="tablist"${attr("aria-label", b.label)}>\n${btns}\n${ind}</div>`;
}

function tabpanel(b, ind) {
  const inner = renderBlocks(b.blocks, ind + "  ");
  const cls = ["tab-panel", b.active ? "active" : "", b.class || ""]
    .filter(Boolean).join(" ");
  return `${ind}<div class="${esc(cls)}"${dataAttrs(b)} id="${esc(b.id)}" role="tabpanel"`
    + `${attr("aria-labelledby", b.labelledBy)} tabindex="0">\n${inner}\n${ind}</div>`;
}

function embed(b, ind) {
  const h = b.height ? ` height="${esc(b.height)}"` : "";
  return `${ind}<iframe src="${esc(b.src)}"${attr("title", b.title)}${h} `
    + `loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}

function dynamic(b, ind) {
  const a = b.source === "youthEvents"
    ? "data-youth-events-container" : "data-events-container";
  const cls = b.class || "";
  const inner = b.fallback
    ? renderBlocks(b.fallback, ind + "  ")
    : `${ind}  <!-- Filled from content.json by content.js -->`;
  return `${ind}<div class="${cls}" ${a}>\n${inner}\n${ind}</div>`;
}

/* ── Page shell ── */

function navHTML() {
  const links = site.nav.map(l =>
    `        <li><a href="${esc(l.href)}" class="${l.cta ? "nav__cta nav__link" : "nav__link"}">${html(l.label)}</a></li>`
  ).join("\n");
  const mobile = site.nav.map(l =>
    `      <a href="${esc(l.href)}" class="${l.cta ? "nav__cta" : "nav__link"}">${html(l.label)}</a>`
  ).join("\n");
  return `  <nav class="nav">
    <div class="container nav__inner">
      <a href="/" class="nav__logo">
        <img class="nav__logo-icon" src="${esc(site.brand.logo)}" alt="Islamic Center of Boston, Wayland">
        <span>
          ${html(site.brand.name)}
          <span class="nav__logo-sub">${html(site.brand.sub)}</span>
        </span>
      </a>
      <ul class="nav__links">
${links}
      </ul>
      <button class="nav__hamburger" id="hamburger" aria-label="Open menu" aria-expanded="false" aria-controls="mobileMenu">
        <span></span><span></span><span></span>
      </button>
    </div>
    <div class="nav__mobile" id="mobileMenu">
${mobile}
    </div>
  </nav>`;
}

function footerHTML() {
  const f = site.footer;
  const cols = f.columns.map(c => {
    const items = c.items.map(i => {
      if (!i.href) return `            <span class="footer__link">${html(i.label)}</span>`;
      const dyn = i.dynamic === "contactEmail" ? " data-contact-email-link" : "";
      return `            <a${dyn} href="${esc(i.href)}" class="footer__link">${html(i.label)}</a>`;
    }).join("\n");
    return `        <div>\n          <div class="footer__col-title">${html(c.title)}</div>\n`
      + `          <div class="footer__links">\n${items}\n          </div>\n        </div>`;
  }).join("\n");
  return `  <footer class="footer">
    <div class="container">
      <div class="footer__grid">
        <div>
          <div class="footer__brand-logo">${html(f.brandLogo)}</div>
          <p class="footer__brand-text">${html(f.brandText)}</p>
          <div class="footer__social">
            <a data-facebook-link href="https://www.facebook.com/icbwayland" class="footer__social-link" aria-label="Facebook" target="_blank" rel="noopener">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </a>
            <a data-youtube-link href="https://youtube.com/c/ICBWayland" class="footer__social-link" aria-label="YouTube" target="_blank" rel="noopener">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="var(--green-900)"/></svg>
            </a>
          </div>
        </div>
${cols}
      </div>
      <div class="footer__bottom">
        <span>${f.copyright}</span>
        <span data-site-updated>Last updated ${esc(site.footer.updated || "")}</span>
      </div>
    </div>
  </footer>`;
}

function renderPage(url, p) {
  const hero = p.hero ? `  <div class="page-hero" id="main">
    <div class="container">
${p.hero.label ? `      <div class="page-hero__label">${html(p.hero.label)}</div>\n` : ""}${p.hero.title ? `      <h1 class="page-hero__title">${html(p.hero.title)}</h1>\n` : ""}${p.hero.sub ? `      <p class="page-hero__sub">${html(p.hero.sub)}</p>\n` : ""}    </div>
  </div>` : "";

  const sections = (p.sections || []).map(s => {
    const tag = s.tag || "section";
    const open = `  <${tag}${attr("class", s.class)}${attr("id", s.id)}`
      + `${attr("style", s.style)}${dataAttrs(s)}>`;
    return `${open}\n${renderBlocks(s.blocks, "    ")}\n  </${tag}>`;
  }).join("\n\n");

  const css = p.css ? `  <style>\n${p.css}\n  </style>\n` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(p.title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css?v=${ASSET_V}" />
  <meta name="description" content="${esc(p.description)}" />
  <link rel="icon" type="image/jpeg" href="/images/icb-logo.jpg" />
  <meta property="og:title" content="${esc(p.title)}" />
  <meta property="og:description" content="${esc(p.description)}" />
${p.canonical ? `  <link rel="canonical" href="${esc(p.canonical)}" />\n  <meta property="og:url" content="${esc(p.canonical)}" />\n` : ""}  <meta property="og:type" content="website" />
${css}</head>
<body>
  <a class="skip-link" href="#main">Skip to main content</a>

${navHTML()}

${hero}

${sections}

${footerHTML()}
  <script src="/icons.js?v=${ASSET_V}"></script>
  <script src="/content.js?v=${ASSET_V}"></script>
  <script src="/app.js?v=${ASSET_V}"></script>
${p.js ? `  <script>\n${p.js}\n  </script>\n` : ""}</body>
</html>
`;
}

/* ── Run ── */

function main() {
  const check = process.argv.includes("--check");
  const outFlag = process.argv.indexOf("--out");
  const outDir = outFlag > -1 ? process.argv[outFlag + 1] : ROOT;
  let written = 0;
  for (const [url, p] of Object.entries(pages)) {
    const rel = url === "/" ? "index.html" : path.join(url.slice(1), "index.html");
    const out = path.join(outDir, rel);
    const body = renderPage(url, p);
    if (!check) {
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, body);
    }
    written++;
  }
  console.log(`${check ? "checked" : "built"} ${written} pages (assets v=${ASSET_V})`);
}

if (require.main === module) main();
module.exports = { renderPage, pages, site };
