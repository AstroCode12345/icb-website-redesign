"""
One-time migration: turn the hand-written page HTML into content/pages.json.

The site is built from a small, repeated vocabulary of components, so each
section's children can be classified into a handful of block types. Anything
this script cannot confidently classify is kept as a "raw" block holding the
original markup, so migrating a page never silently drops content. Raw blocks
are the backlog: every one that remains is a thing the portal cannot edit yet.
"""
import json
import re
import sys
from pathlib import Path

from bs4 import BeautifulSoup, Comment, NavigableString, Tag

ROOT = Path(__file__).resolve().parent.parent
ICONS = json.loads((ROOT / "tools" / "icons.json").read_text())
# Match a rendered <svg> back to its library name so blocks store "heart",
# not 400 bytes of path data.
def _norm_svg(markup):
    return re.sub(r"\s+", " ",
                  str(BeautifulSoup(markup, "html.parser"))).strip()


BY_BODY = {_norm_svg(v): k for k, v in ICONS.items()}


def icon_name(el):
    svg = el.find("svg") if el else None
    if not svg:
        return None
    return BY_BODY.get(_norm_svg("".join(str(c) for c in svg.contents)))


def inner(el):
    """Inner HTML, whitespace-collapsed. Keeps inline <a>/<strong>/<em>."""
    return re.sub(r"\s+", " ", "".join(str(c) for c in el.contents)).strip()


def text(el):
    return re.sub(r"\s+", " ", el.get_text()).strip()


def classes(el):
    return el.get("class", []) if isinstance(el, Tag) else []


def block_cards(grid, kind):
    """info-card / nav-card grids. nav-cards are links and carry an href."""
    items = []
    for card in grid.find_all(class_=f"{kind}-card", recursive=False):
        title = card.find(class_=f"{kind}-card__title")
        bodies = card.find_all(class_=f"{kind}-card__body")
        item = {
            "title": text(title) if title else "",
            "body": inner(bodies[0]) if bodies else "",
        }
        if len(bodies) > 1:
            item["extraBody"] = [inner(b) for b in bodies[1:]]
        extra = [c for c in card.children
                 if isinstance(c, Tag)
                 and not any(x.startswith(f"{kind}-card__") for x in classes(c))]
        if extra:
            kids = [b for b in (classify(c) for c in extra) if b]
            if kids:
                item["blocks"] = kids
        ic = icon_name(card.find(class_=f"{kind}-card__icon"))
        if ic:
            item["icon"] = ic
        if kind == "nav" and card.get("href"):
            item["href"] = card["href"]
            if card.get("target") == "_blank":
                item["external"] = True
            arrow = card.find(class_="nav-card__arrow")
            if arrow:
                label = re.sub(r"\s+", " ", arrow.get_text()).strip()
                if label and label != "Read more":
                    item["cta"] = label
        items.append(item)
    if not items:
        return None
    out = {"type": f"{kind}cards", "items": items}
    grid_cls = " ".join(classes(grid))
    if grid_cls:
        out["gridClass"] = grid_cls
    return out


def block_table(tbl):
    head, rows = [], []
    for tr in tbl.find_all("tr"):
        cells = tr.find_all(["td", "th"])
        vals = []
        for c in cells:
            d = data_attrs(c)
            vals.append({"html": inner(c), "data": d} if d else inner(c))
        if not any(v for v in vals):
            continue
        if all(c.name == "th" for c in cells) and not head:
            head = vals
        else:
            rows.append(vals)
    out = {"type": "table", "rows": rows}
    if head:
        out["columns"] = head
    body = tbl.find("tbody")
    if body is not None and data_attrs(body):
        out["bodyData"] = data_attrs(body)
    if tbl.get("data-school-dates"):
        out["bind"] = "schoolDates:" + tbl["data-school-dates"]
    if "prayer-table" in classes(tbl):
        out["style"] = "prayer"
    return out


def data_attrs(el):
    return {k: v for k, v in el.attrs.items()
            if k.startswith("data-")} if isinstance(el, Tag) else {}


def text_block(el, body, cls):
    blk = {"type": "text", "tag": el.name, "html": body}
    if cls:
        blk["class"] = " ".join(cls)
    if el.get("style"):
        blk["style"] = el["style"]
    return blk


def block_faq(items, variant=None):
    out = []
    for it in items:
        q = it.find(class_="faq-item__q") or it.find(["summary", "h3"])
        a = it.find(class_="faq-item__a") or it.find("p")
        out.append({"q": text(q) if q else "", "a": inner(a) if a else ""})
    blk = {"type": "faq", "items": out}
    if variant:
        blk["variant"] = variant
    return blk


def faq_classes(el):
    return " ".join(classes(el))


# Containers that only arrange their children. They become a "group" block and
# their children are classified individually, so a two-column layout of cards is
# editable as cards rather than as one opaque lump of HTML.
# Inline-level tags. A container whose element children are all inline is one
# run of prose, not a stack of blocks: splitting <strong>/<br>/<a> out of a
# sentence would make the text uneditable as a sentence.
INLINE = {"a", "strong", "em", "b", "i", "br", "span", "code", "small",
          "sup", "sub", "svg", "img", "abbr", "time"}

LAYOUTS = {
    "two-col": "two-col", "info-grid": "info-grid", "contact-grid": "contact-grid",
    "events-grid": "events-grid", "quicklinks": "quicklinks",
    "about-split": "about-split", "prayers-grid": "prayers-grid",
    "curriculum-grid": "curriculum-grid", "prayer-table": "prayer-table",
    "nav-card-grid": "nav-card-grid",
}


def classify(el):
    """Classify, then re-attach any data-* attributes the block would drop."""
    blk = _classify(el)
    if blk and isinstance(el, Tag):
        if blk.get("type") != "dynamic":
            d = data_attrs(el)
            if d:
                blk["data"] = d
        if el.get("id") and not blk.get("id"):
            blk["id"] = el["id"]
    return blk


def _classify(el):
    """One DOM node -> one block. Returns None for whitespace and comments."""
    if isinstance(el, Comment):
        return None
    if isinstance(el, NavigableString):
        t = re.sub(r"\s+", " ", str(el)).strip()
        return {"type": "prose", "parts": [{"t": "p", "text": t}]} if t else None

    cls = classes(el)

    if "tab-bar" in cls:
        return {"type": "tabbar", "label": el.get("aria-label", ""), "tabs": [
            {"id": b.get("data-tab") or b.get("aria-controls", ""),
             "label": text(b), "data": data_attrs(b),
             "btnId": b.get("id", ""), "controls": b.get("aria-controls", "")}
            for b in el.find_all(class_="tab-btn")]}

    if "tab-panel" in cls:
        return {"type": "tabpanel", "id": el.get("id", ""),
                "labelledBy": el.get("aria-labelledby", ""),
                "active": "active" in cls,
                "class": " ".join(c for c in cls
                                  if c not in ("tab-panel", "active")),
                "blocks": [b for b in (classify(c) for c in el.children) if b]}

    if el.name == "a" and any(c.startswith("btn") for c in cls):
        return {"type": "cta", "label": text(el), "href": el.get("href", ""),
                "class": " ".join(cls),
                **({"external": True} if el.get("target") == "_blank" else {})}

    if "faq-item" in cls:
        return block_faq([el])

    if "section__header" in cls:
        label = el.find(class_="section__label")
        title = el.find(["h2", "h3"])
        blk = {"type": "heading"}
        if label:
            blk["label"] = text(label)
        if title:
            blk["title"] = inner(title)
        subs = [{"text": inner(x), "class": " ".join(classes(x))}
                for x in el.find_all("p", recursive=False)]
        if subs:
            blk["sub"] = subs
        if el.get("style"):
            blk["style"] = el["style"]
        return blk

    for kind in ("nav", "info"):
        if f"{kind}-card-grid" in cls or (
            "info-grid" in cls and kind == "info"
        ):
            b = block_cards(el, kind)
            if b:
                return b

    if el.name == "table":
        return block_table(el)

    if "faq-list" in cls:
        details = el.find_all("details")
        if details:
            blk = block_faq(details, variant="details")
            blk["itemClass"] = faq_classes(details[0])
            blk["listClass"] = " ".join(cls)
            return blk

    if el.name == "details":
        return block_faq([el], variant="details")

    kid_tags = [c for c in el.children if isinstance(c, Tag)]
    if (kid_tags and "faq-item" not in cls
            and all("faq-item" in classes(k) for k in kid_tags)):
        return block_faq(kid_tags)

    layout = next((LAYOUTS[c] for c in cls if c in LAYOUTS), None)
    if layout:
        kids = [b for b in (classify(c) for c in el.children) if b]
        if kids:
            return {"type": "group", "layout": layout, "blocks": kids}

    if "info-card" in cls:
        title = el.find(class_="info-card__title")
        bodies = el.find_all(class_="info-card__body")
        item = {"title": text(title) if title else "",
                "body": inner(bodies[0]) if bodies else ""}
        if len(bodies) > 1:
            item["extraBody"] = [inner(b) for b in bodies[1:]]
        ic = icon_name(el.find(class_="info-card__icon"))
        if ic:
            item["icon"] = ic
        extra = [c for c in el.children
                 if isinstance(c, Tag)
                 and not any(x.startswith("info-card__") for x in classes(c))]
        if extra:
            item["blocks"] = [b for b in (classify(c) for c in extra) if b]
        return {"type": "infocards", "items": [item]}

    if "quicklink" in cls:
        blk = {"type": "quicklinks", "items": [{
            "label": text(el.find(class_="quicklink__label") or el),
            "href": el.get("href", "")}]}
        ic = icon_name(el.find(class_="quicklink__icon"))
        if ic:
            blk["items"][0]["icon"] = ic
        return blk

    if "nav-card" in cls and el.name == "a":
        title = el.find(class_="nav-card__title")
        body = el.find(class_="nav-card__body")
        item = {"title": text(title) if title else "",
                "body": inner(body) if body else "", "href": el.get("href", "")}
        ic = icon_name(el.find(class_="nav-card__icon"))
        if ic:
            item["icon"] = ic
        if el.get("target") == "_blank":
            item["external"] = True
        arrow = el.find(class_="nav-card__arrow")
        if arrow:
            label = re.sub(r"\s+", " ", arrow.get_text()).strip()
            if label and label != "Read more":
                item["cta"] = label
        return {"type": "navcards", "items": [item]}

    if el.name in ("ul", "ol"):
        return {"type": "prose", "parts": [{
            "t": "list", "ordered": el.name == "ol",
            "items": [inner(li) for li in el.find_all("li", recursive=False)]}]}

    # A plain prose wrapper: a div whose children are only <p>/<h2>/<h3>/lists.
    kids = [c for c in el.children if isinstance(c, Tag)]
    if el.name in ("div", "section") and kids and all(
        k.name in ("p", "h2", "h3", "ul", "ol", "img") for k in kids
    ):
        blk = {"type": "prose", "parts": []}
        if cls:
            blk["class"] = " ".join(cls)
        style = el.get("style", "")
        if "text-align:center" in style.replace(" ", ""):
            blk["align"] = "center"
        if "max-width" in style:
            blk["narrow"] = True
        for k in kids:
            if k.name in ("h2", "h3"):
                blk["parts"].append({"t": "heading", "level": k.name, "text": inner(k)})
            elif k.name == "p":
                blk["parts"].append({"t": "p", "text": inner(k)})
            elif k.name in ("ul", "ol"):
                blk["parts"].append({
                    "t": "list", "ordered": k.name == "ol",
                    "items": [inner(li) for li in k.find_all("li", recursive=False)],
                })
            elif k.name == "img":
                blk["parts"].append({"t": "img", "src": k.get("src", ""),
                                     "alt": k.get("alt", "")})
            elif k.name == "span" and "section__label" in classes(k):
                blk["parts"].append({"t": "label", "text": text(k)})
            else:
                blk["parts"].append({"t": "raw", "html": str(k)})
        if blk["parts"]:
            return blk

    if el.name == "p":
        if cls or el.get("style"):
            return text_block(el, inner(el), cls)
        return {"type": "prose", "parts": [{"t": "p", "text": inner(el)}]}

    if el.name in ("h1", "h2", "h3", "h4"):
        if cls or el.get("style"):
            return text_block(el, inner(el), cls)
        return {"type": "heading", "level": el.name, "title": inner(el)}

    if el.name == "form":
        # The PayPal button is a signed hosted form. It is deliberately opaque:
        # editing its fields by hand would break the payment, so the portal
        # exposes the donate URL instead and this stays verbatim.
        return {"type": "form", "html": re.sub(r"\s+", " ", str(el)).strip()}

    if el.name == "iframe":
        return {"type": "embed", "src": el.get("src", ""),
                "title": el.get("title", ""), "height": el.get("height", "")}

    if el.name == "svg":
        name = icon_name(el.parent) if el.parent else None
        return {"type": "icon", "name": name} if name else \
            {"type": "raw", "html": re.sub(r"\s+", " ", str(el)).strip()}

    # Containers content.js fills at runtime (events, youth events). They hold
    # no authored content, so the portal edits the list, not this placeholder.
    for attr, src in (("data-events-container", "events"),
                      ("data-youth-events-container", "youthEvents")):
        if el.has_attr(attr):
            blk = {"type": "dynamic", "source": src,
                   "class": " ".join(cls)}
            kids = [b for b in (classify(c) for c in el.children) if b]
            if kids:
                blk["fallback"] = kids
            return blk

    tag_kids = [c for c in el.children if isinstance(c, Tag)]

    # A leaf: no element children, just text. Small uppercase label divs and
    # standalone links both land here.
    if el.name == "img":
        blk = {"type": "text", "tag": "img", "html": "",
               "src": el.get("src", ""), "alt": el.get("alt", "")}
        if cls:
            blk["class"] = " ".join(cls)
        if el.get("style"):
            blk["style"] = el["style"]
        return blk

    if not tag_kids:
        body = inner(el)
        if not body:
            return ({"type": "decor", "class": " ".join(cls)} if cls else None)
        if el.name == "a":
            blk = {"type": "cta", "label": text(el), "href": el.get("href", ""),
                   "variant": "link"}
            if cls:
                blk["class"] = " ".join(cls)
            if el.get("style"):
                blk["style"] = el["style"]
            if el.get("target") == "_blank":
                blk["external"] = True
            return blk
        return text_block(el, body, cls)

    # All-inline children: one run of prose, keeping the inline markup intact.
    if tag_kids and all(k.name in INLINE for k in tag_kids):
        body = inner(el)
        if body:
            return text_block(el, body, cls)

    # A wrapper the vocabulary has no name for (usually a style-only div for
    # centring or horizontal scroll). Recurse so children stay editable.
    if el.name in ("div", "section", "a") and tag_kids:
        kids = [b for b in (classify(c) for c in el.children) if b]
        if kids:
            grp = {"type": "group", "layout": "plain", "blocks": kids}
            style = el.get("style", "")
            if style:
                grp["style"] = style
            if cls:
                grp["class"] = " ".join(cls)
            return grp

    return {"type": "raw", "html": re.sub(r"\s+", " ", str(el)).strip()}


def extract_page(path):
    soup = BeautifulSoup(path.read_text(encoding="utf-8"), "html.parser")
    page = {}

    t = soup.find("title")
    if t:
        page["title"] = text(t)
    d = soup.find("meta", attrs={"name": "description"})
    if d:
        page["description"] = d.get("content", "")
    c = soup.find("link", attrs={"rel": "canonical"})
    if c:
        page["canonical"] = c.get("href", "")

    # Several pages carry their own <style> block for page-specific components.
    # Kept verbatim: it is design code, not content, and is not portal-editable.
    styles = [st.get_text() for st in soup.head.find_all("style")] if soup.head else []
    if styles:
        page["css"] = "\n".join(styles).strip()

    # Page-level scripts (the tab controllers on Board & Committees and Youth).
    # Behaviour, not content: kept verbatim and not portal-editable.
    scripts = [sc.get_text() for sc in soup.find_all("script")
               if not sc.get("src") and sc.get_text().strip()]
    if scripts:
        page["js"] = "\n".join(scripts).strip()

    hero = soup.find(class_="page-hero")
    if hero:
        h = {}
        for key, sel in (("label", "page-hero__label"),
                         ("title", "page-hero__title"),
                         ("sub", "page-hero__sub")):
            el = hero.find(class_=sel)
            if el:
                h[key] = inner(el)
        page["hero"] = h

    # Every body-level region, so components that sit outside a
    # <section class="section"> (the homepage prayer bar, hero, stats and verse
    # banner) are captured too rather than silently dropped.
    sections = []
    skip = ("nav", "footer", "script", "noscript")
    for el in soup.body.children:
        if not isinstance(el, Tag) or el.name in skip:
            continue
        c = classes(el)
        if "skip-link" in c or "page-hero" in c:
            continue
        # Walk every child, not just .container: the homepage hero keeps a
        # decorative .hero__pattern as a sibling of its container, and
        # descending straight into .container dropped it.
        blocks = [b for b in (classify(ch) for ch in el.children) if b]
        # An empty region can still matter: the homepage announcement bar is an
        # empty div that content.js fills and unhides.
        if not blocks and not data_attrs(el):
            continue
        sec = {"blocks": blocks, "tag": el.name, "class": " ".join(c)}
        if data_attrs(el):
            sec["data"] = data_attrs(el)
        if el.get("id"):
            sec["id"] = el["id"]
        if el.get("style"):
            sec["style"] = el["style"]
        sections.append(sec)
    page["sections"] = sections
    return page


def main():
    pages = {}
    for f in sorted(ROOT.glob("**/index.html")):
        if "node_modules" in f.parts:
            continue
        url = "/" + str(f.relative_to(ROOT).parent).replace(".", "").strip("/")
        url = (url.rstrip("/") + "/") if url != "/" else "/"
        pages[url] = extract_page(f)

    out = ROOT / "content" / "pages.json"
    out.write_text(json.dumps(pages, indent=2, ensure_ascii=False) + "\n",
                   encoding="utf-8")

    raw = sum(1 for p in pages.values() for s in p["sections"]
              for b in s["blocks"] if b["type"] == "raw")
    total = sum(1 for p in pages.values() for s in p["sections"]
                for b in s["blocks"])
    print(f"{len(pages)} pages, {total} blocks, {raw} still raw "
          f"({raw / total * 100:.0f}%)")
    kinds = {}
    for p in pages.values():
        for s in p["sections"]:
            for b in s["blocks"]:
                kinds[b["type"]] = kinds.get(b["type"], 0) + 1
    for k, v in sorted(kinds.items(), key=lambda x: -x[1]):
        print(f"  {v:4}  {k}")


if __name__ == "__main__":
    sys.exit(main())
