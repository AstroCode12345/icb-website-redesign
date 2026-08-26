# ICB Wayland — Build Plan (Phase 2)

Living spec. Updated as decisions are made and work ships.
Last updated: 26 August 2026, after the full-site audit pass.

---

## Confirmed facts

- **Founded 1979** (1400 AH). The old redesign said 1982 — that is wrong and must
  be corrected everywhere it appears.
- History: Sunday school began 1979 in a Cambridge public school facility. Property
  at 126 Boston Post Road bought 1986 (12-room house, 1.75 acres). Moved in 1988.
  New structure early 1990s. Adjacent parcel 1999 for parking. Renovation approved
  April 2002, construction 2004, reopened Fall 2005 (added 10,000 sq ft to the
  existing 5,200 sq ft; educational space for 400).
- **Google Calendar is live and maintained**: `icbcalendar@icbwayland.org`
  → embed it directly, no manual event entry needed for the main calendar.
- **Facilities booking form** (verified live): https://forms.gle/KWbdEzghSwjwVYZLA
- **Facilities policy PDF** is current, dated 1 December 2025.
  Full extracted text saved at `_source-content/facilities-policy-text.txt`.
- Social Hall max capacity: **160**.
- Facilities contact: `facilities@icbwayland.org`

### Youth group links (from linktr.ee/icbyg)
- Registration 2025-2026: https://docs.google.com/forms/d/1dylOTYnEggEu01FBKMjlDfmc5E9kw_q1eOaBKrM0EY8/viewform
- Honor Code: https://docs.google.com/document/d/1d79oGsFgU81cLf5etuqQhw8lS0dudHCuENHOjpQ6CfU/edit
- Instagram: https://www.instagram.com/icbwayland.yg/ (link only for now)

### School portals
- Parents: https://icbwaylandss.sunwebapp.com/
- Teachers: https://icbwaylandss.sunwebapp.com/admin/

---

## Site map (target)

- **Home**
- **About** (section landing page with cards)
  - History (was "About ICB") — include Objectives on this page
  - Membership
  - Management (Board + Committees combined)
  - Contact
- **Support Us**
- **Facilities** (section landing page)
  - Facilities Rental (rates, rules, booking form link)
  - Wedding Services
  - Funeral Services
  - Family Matters
- **Prayers**
  - Friday Prayers
- **School** — short page linking the necessary things
- **Calendar** — embedded Google Calendar; no past events, no ongoing activities
- **Youth Group** — one page, two tabs. Events tab opens by default so
  upcoming events are the first thing a visitor sees.
  - Upcoming Events (entries with date, description, signup link)
  - Welcome to YG (registration form, honor code, Linktree, Instagram)
- **Outreach** — keep, expand with more content from the original site

### Removed / dropped
`resources.html`, `newsletters.html`, `iftars.html`, `ramadan.html`,
`fooddrive.html`, `collegescholarship/`, `directions.html`, and the Programs page
(`gem.html`).

`news.html` was **kept** and rebuilt after all — the press archive is real,
credible material and the links that still resolve were worth carrying over.
`resources.html` was built and then removed at Taymour's request.

---

## Architecture decisions

| Area | Decision |
|---|---|
| Preview → production | Git branch model. Admin saves to a `preview` branch → Vercel builds a preview URL → admin reviews → "Publish Live" merges to `main`. |
| Youth flyer images | Uploaded through the portal, committed into the site repo. No external image host. |
| Portals | **One** admin app with three roles (main / school / youth). Each role sees only its own sections. |
| Content fidelity | Verbatim from the original site. Fix typos only. |
| Navigation | Section landing pages with cards. **No hover dropdowns** (better for elderly and touch users). |
| Publish authority | Anyone who can edit can also publish. *Revisit later if the board wants approval gates.* |
| Youth signup | Each event has a "Signup Link" field; they paste the Google Form URL. No signups collected on our site. |

---

## What each role can edit

**Main admin** — prayer times, Friday speaker/khatib, announcement banner, events,
Sunday school time, contact and social links, donate URL.

**School admin** — Sunday school hours, school calendar, admission info and links,
school contact. Eventually able to replace the curriculum PDFs.

**Youth admin** — youth events only (flyer image, title, description, date,
signup link) plus the youth page intro text.

---

## Specific changes requested

- [x] Founding year 1982 → **1979** everywhere
- [x] Remove the Programs page
- [x] Add the **khatib** for Jumu'ah — now a dated, admin-editable schedule on
      the Prayers page; the soonest upcoming date is derived automatically as
      "this week's khateeb", and past dates drop off on their own
- [ ] Preview → production publishing flow

---

## Build order

1. [x] Nav restructure + section landing pages for all sections — **done**.
   Root-relative paths site-wide (required for the new folders), rebuilt
   `app.js` active-nav logic (path-based, not filename-based, since several
   pages now share the name `index.html`), 9-item nav with no dropdowns.
2. [x] Port verbatim content: About (History/Objectives, Membership,
   Management, Contact) and Facilities (+ wedding/funeral/family matters) —
   **done**, using content already scraped and verified against the live
   site. School and Youth also fully built. Outreach **is** now expanded:
   the full 12-question Outreach FAQ was ported in, and School Admission and
   the press archive were brought over from the old site.
3. [ ] Calendar page: embed the live Google Calendar — not yet done.
   `calendar.html` still has the old hand-built event list; nav/footer were
   updated but the embed itself is next.
4. [ ] Preview → production pipeline (set up early so it can be demoed)
5. [ ] Three-role admin portal
6. [~] Youth events — **wired up**. `youthEvents` is now a real field in
   `content.json`, rendered on the Youth page and editable in the admin
   (date, title, details, category, signup link). Flyer *image upload* is
   still to do; until then an event shows as a dated card without artwork.

### Notes from this pass
- Board and Committee rosters include real names, and the Funeral Services
  page includes two personal cell numbers (Aijaz Baloch, Muneeb Khan) exactly
  as published on the live site. **Still unresolved** — flagged twice, no
  decision yet.
- Membership online renewal **is** wired up. The real PayPal cart form
  (`hosted_button_id` VBNU2YYYNYDEL) was pulled from the live page's HTML and
  embedded directly, fee dropdown and all. Donations use the real buttons too
  (Z25J5QYZZSYSE general/Zakat, 6UJSCMDHAP22E humanitarian). None have been
  click-tested end to end by a human — worth doing once before launch.
- The old site's PDFs and the Adhan recording are now **self-hosted** under
  `/documents/`, so nothing breaks when icbwayland.org is switched off.

### Audit pass — 26 August 2026
Full-site review; everything below was found and fixed in one pass.
- **Dated content now expires by itself.** Events, youth events, and Friday
  khateebs are filtered against today's date in `content.js`. The homepage had
  been showing May events as "upcoming" in late August. Volunteers maintain
  this site, so it needed to stop going stale on its own rather than relying
  on someone remembering to prune.
- **`data-youth-events-container` was a dead hook** — the Youth page promised
  events would appear once leaders added them, but nothing could ever fill it.
  Now backed by real data and an admin editor.
- **The admin's offline fallback held a decommissioned donate URL** and stale
  prayer times. Synced, flagged `mock: true`, shown behind a clear warning
  banner, and publishing is now blocked outright while on stub data.
- Added `sitemap.xml`, `robots.txt`, canonical URLs, a designed `404.html`,
  and `vercel.json` cache headers. Canonicals assume the site takes over
  **icbwayland.org** — change the `BASE` value if the domain differs.
- Added `?v=` cache-busting to CSS/JS. Without it, returning visitors keep
  running the previous deploy's JavaScript.
- Accessibility: hamburger state no longer goes stale when the menu closes by
  outside-click, Escape closes it, youth tabs got full tab/tabpanel wiring
  with arrow-key navigation, and the membership fee dropdown got a label.
- Footer "last updated" is now stamped automatically on publish instead of
  being a hand-typed date that sat months behind.

---

## Parked for later

- **Guided facilities booking tool.** Replace the Google Form with a friendlier
  flow that walks a non-technical or elderly renter through what they need and
  calculates the cost up front. All the pricing logic needed for this already
  exists in `_source-content/facilities-policy-text.txt`.
- Pulling the youth Instagram feed onto the site instead of just linking it.
- Per-person logins / approval gates on publishing, if the board wants them.
- Flyer image upload for youth events (the rest of the youth event flow is done).
- Confirm the production domain and Vercel project. Canonicals and the sitemap
  currently assume `icbwayland.org`.
- `ICBFacilitiesRentalPolicyAgreement.pdf` is 5.3 MB — worth compressing before
  launch, it is a heavy download on a phone.
