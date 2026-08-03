# ICB Wayland — Build Plan (Phase 2)

Living spec. Updated as decisions are made and work ships.
Last updated: after scoping call with the long-time site admin.

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
- **Youth Group**
  - About / signup (registration form, honor code)
  - Events (entries with flyer, description, signup link)
- **Outreach** — keep, expand with more content from the original site

### Removed / dropped
`resources.html`, `news.html`, `newsletters.html`, `iftars.html`, `ramadan.html`,
`fooddrive.html`, `collegescholarship/`, `directions.html`, and the Programs page
(`gem.html`).

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
- [ ] Add the **khatib** for Jumu'ah on the homepage
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
   site. School and Youth also fully built. Outreach not yet expanded with
   additional content — still pending.
3. [ ] Calendar page: embed the live Google Calendar — not yet done.
   `calendar.html` still has the old hand-built event list; nav/footer were
   updated but the embed itself is next.
4. [ ] Preview → production pipeline (set up early so it can be demoed)
5. [ ] Three-role admin portal
6. [ ] Youth events with flyer upload (the events page exists with a real
   empty state, ready to be wired up)

### Notes from this pass
- Board and Committee rosters include real names, and the Funeral Services
  page includes two personal cell numbers (Aijaz Baloch, Muneeb Khan) exactly
  as published on the live site. Flagged to Taymour; no action taken pending
  his call with the admin.
- Membership page has real fees ($204.56 family / $102.53 single) and the
  real membership form PDF, but no confirmed "renew online" payment link was
  found on the original site — only the mail-in form and Treasurer contact
  are linked.

---

## Parked for later

- **Guided facilities booking tool.** Replace the Google Form with a friendlier
  flow that walks a non-technical or elderly renter through what they need and
  calculates the cost up front. All the pricing logic needed for this already
  exists in `_source-content/facilities-policy-text.txt`.
- Pulling the youth Instagram feed onto the site instead of just linking it.
- Per-person logins / approval gates on publishing, if the board wants them.
