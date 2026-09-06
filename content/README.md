# content/

The site's content, and the only thing the admin portal writes.

- `site.json` — brand, nav, footer: everything shared by every page.
- `pages.json` — one entry per URL: head metadata, hero, and an ordered list of
  blocks. Also `css` and `js` for the few pages that carry their own.

`build.js` at the repo root turns these into the static HTML that ships.
Vercel runs it on every deploy (`buildCommand` in `vercel.json`), so publishing
from the portal is: write JSON to GitHub, Vercel rebuilds, pages are static.

Do not hand-edit the generated `*/index.html`. Edit the JSON and run:

    node build.js

## Block types

| type | what it is |
|---|---|
| `text` | one element, keeping its tag, class, style and data bindings |
| `prose` | a run of paragraphs, headings, lists and images |
| `heading` | a section header: eyebrow label, title, optional lead paragraphs |
| `group` | a layout wrapper; `blocks` holds its children |
| `infocards` / `navcards` | card grids; nav cards are links |
| `table` | rows, optional `columns`; cells may carry data bindings |
| `cta` | a button or inline link |
| `quicklinks` | the icon-and-label link row |
| `faq` | question and answer pairs; `variant: "details"` for accordions |
| `tabbar` / `tabpanel` | the tab component |
| `embed` | an iframe (calendar, map) |
| `dynamic` | a container `content.js` fills at runtime, with a static fallback |
| `form` | verbatim markup, currently only the signed PayPal button |
| `icon` / `decor` | a named icon, or a purely decorative element |

Icons are referenced by name from `tools/icons.json`, never as raw SVG.

`tools/extract_pages.py` is the one-time migration that produced `pages.json`
from the old hand-written HTML. It is kept for reference, not for routine use.
