#!/usr/bin/env python3
"""
Regenerate sitemap.xml from the pages that actually exist.

The sitemap had been maintained by hand and drifted: /about/accessibility/ was
added to the site but never to the sitemap, so it was invisible to search
engines. Deriving it from the filesystem means adding a page is enough.

    python3 tools/build-sitemap.py

lastmod comes from each file's last commit date, so it reflects when the page
really changed rather than when this script happened to run. 404.html is
excluded: it is an error page, not a destination.
"""
import subprocess
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://icbwayland.org"

# Landing pages people search for outrank the detail pages beneath them.
# Anything not listed is a sub-page and takes the default.
PRIORITY = {
    "/": "1.0",
    "/prayers/": "0.9",
    "/about/": "0.8",
    "/calendar/": "0.8",
    "/school/": "0.8",
    "/services/": "0.8",
    "/support/": "0.8",
    "/outreach/": "0.7",
    "/youth/": "0.7",
}
DEFAULT_PRIORITY = "0.6"


def url_path(index_html: Path) -> str:
    rel = index_html.relative_to(ROOT).parent.as_posix()
    return "/" if rel == "." else f"/{rel}/"


def last_commit_date(path: Path) -> str:
    """Date of the file's last commit, or today if it is not committed yet."""
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%cs", "--", str(path.relative_to(ROOT))],
            cwd=ROOT, capture_output=True, text=True, timeout=10,
        )
        stamp = out.stdout.strip()
        if stamp:
            return stamp
    except Exception:
        pass
    return date.today().isoformat()


def main() -> int:
    pages = sorted(
        p for p in ROOT.glob("**/index.html")
        if "node_modules" not in p.parts
    )
    if not pages:
        print("No pages found; refusing to write an empty sitemap.", file=sys.stderr)
        return 1

    entries = []
    for page in pages:
        loc = url_path(page)
        entries.append((loc, last_commit_date(page),
                        PRIORITY.get(loc, DEFAULT_PRIORITY)))

    # Highest priority first, then alphabetical, so the file reads sensibly and
    # regenerating it produces no spurious diff.
    entries.sort(key=lambda e: (-float(e[2]), e[0]))

    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, mod, pri in entries:
        lines += ["  <url>",
                  f"    <loc>{BASE}{loc}</loc>",
                  f"    <lastmod>{mod}</lastmod>",
                  f"    <priority>{pri}</priority>",
                  "  </url>"]
    lines.append("</urlset>")

    (ROOT / "sitemap.xml").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"sitemap.xml: {len(entries)} pages")
    for loc, mod, pri in entries:
        print(f"  {pri}  {mod}  {loc}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
