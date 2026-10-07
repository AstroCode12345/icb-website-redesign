#!/usr/bin/env python3
"""
Regenerate sitemap.xml from the pages that are part of the site.

The sitemap had been maintained by hand and drifted: /about/accessibility/ was
added to the site but never to the sitemap, so it was invisible to search
engines. Building it from the pages themselves means nobody has to remember.

    python3 tools/build-sitemap.py

Only pages git tracks are listed. The folder can also hold things that are
never published, such as saved copies of the old site kept for reference, and
reading the disk listed those too: on 3 October 2026 it put
"/OG-website pages/" in the sitemap. So a new page has to be added to git
(`git add`) before it shows up here, and the script says so if it finds one
that has not been.

A page with an on/off switch in content.json (see SWITCHED_PAGES) is left out
while it is off, since nothing links to it and it only shows a placeholder.

lastmod comes from each file's last commit date, so it reflects when the page
really changed rather than when this script happened to run. 404.html is
excluded: it is an error page, not a destination.
"""
import json
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

# Pages an admin can switch on and off from the portal, and where each switch
# lives in content.json. While a page is off it shows a placeholder and nothing
# links to it, so it stays out of the sitemap. Run this script again once the
# page has been switched on.
SWITCHED_PAGES = {
    "/ramadan/": ("ramadan", "visible"),
}


def url_path(index_html: Path) -> str:
    rel = index_html.relative_to(ROOT).parent.as_posix()
    return "/" if rel == "." else f"/{rel}/"


def git_pages(*flags: str) -> list:
    """The index.html files `git ls-files` reports for these flags.

    With no flags that is every page git tracks, including one that has been
    added but not committed yet. Raises if git cannot be asked.
    """
    out = subprocess.run(
        ["git", "ls-files", "-z", *flags, "--", "*index.html"],
        cwd=ROOT, capture_output=True, text=True, timeout=20, check=True,
    )
    pages = (ROOT / name for name in out.stdout.split("\0") if name)
    return sorted(p for p in pages if p.name == "index.html" and p.is_file())


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


def read_content() -> dict:
    """content.json, or nothing if it cannot be read."""
    try:
        return json.loads((ROOT / "content.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        print("Warning: could not read content.json, so pages with a switch "
              "are left out.", file=sys.stderr)
        return {}


def switched_off(loc: str, content: dict) -> bool:
    """True if this page has a switch in content.json and it is not on."""
    if loc not in SWITCHED_PAGES:
        return False
    section, key = SWITCHED_PAGES[loc]
    settings = content.get(section)
    return not (isinstance(settings, dict) and settings.get(key))


def main() -> int:
    try:
        pages = git_pages()
        # Not tracked and not ignored: most likely a new page nobody has added yet.
        not_added = git_pages("--others", "--exclude-standard")
    except (OSError, subprocess.SubprocessError):
        print("Could not ask git which pages are part of the site, and guessing "
              "from the folder is how junk got listed before. Run this inside "
              "the site's git folder.", file=sys.stderr)
        return 1
    if not pages:
        print("No pages found; refusing to write an empty sitemap.", file=sys.stderr)
        return 1

    content = read_content()
    entries, off = [], []
    for page in pages:
        loc = url_path(page)
        if switched_off(loc, content):
            off.append(loc)
            continue
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
    for loc in off:
        print(f"  left out, switched off in content.json: {loc}")
    for page in not_added:
        print(f"  left out, not added to git yet: {url_path(page)}"
              "  (git add it, then run this again)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
