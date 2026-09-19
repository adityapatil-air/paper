# IJEPA — Ruthless UX Audit

Scope: full click-through of the live local build (Landing, Login/Register, About, Editorial Board, Browse Papers, Journal Issues, Call for Papers, Submit Manuscript, Admin/Author/Reviewer dashboards) on desktop and mobile (375px).

---

## PASS 1 — The Ruthless Founder

*"You've scaled 3 SaaS products past $10M ARR. You've studied Linear, Superhuman, Vercel, Raycast, Arc. Your only goal: make every visitor convert."*

Fine. Let's go.

**"Trusted by 500+ Researchers Worldwide" and zero published papers on the site.** This is the first thing I'd cut. Every single content section that lists real output — Latest Articles, Current Issue, Browse Papers — renders an empty state right now. A trust badge sitting directly above a homepage that cannot show one published paper is not aspirational, it's a tell. If you can't back the badge with proof today, the badge is a liability, not an asset. Either seed 3-6 real (or realistic placeholder) papers so every list has content, or drop the badge until you can.

**The #1 and #2 hero CTAs both dead-end.** "Submit Manuscript" bounces an unauthenticated visitor straight to a bare login form with zero context on what submitting even involves. "View Current Issue" — the *second* most prominent button on the entire site — leads to a page that says "Loading current issue..." and then nothing. You spent your best pixels (top of page, above the fold, blue gradient button) on two links that currently show a stranger a login wall and an empty box. That's not a funnel, that's a wall.

**"Starting Year: 2026" on the About page.** This is a direct, findable contradiction of "trusted by 500+ researchers" three clicks away. A skeptical visitor — a reviewer deciding whether to submit their career-relevant research here — will find this in under a minute and lose confidence in the whole site. Pick one story and make every page tell it.

**No proof-of-quality anywhere.** No named institutions, no sample PDF, no reviewer photos with real affiliations beyond the Editorial Board page, no citation count, no "as featured in" — nothing a skeptical academic uses to judge a journal's legitimacy in the first 10 seconds. Right now the site's entire credibility rests on the word "peer-reviewed" repeated in prose. That's not evidence, that's a claim.

**Footer social icons are literal letters ("in 𝕏 f ▶"), not icons.** It's a small thing until you notice it, and once you notice it you can't unsee it — it reads as an unfinished template, which undermines everything else that's now genuinely well-designed (the new hero, the new auth screens). Either wire real SVG icons or drop the row.

**Editorial Board is initials-in-a-circle, every single member, no photos.** For a page whose entire job is "these are real, credentialed humans vouching for this journal," a wall of identical blue circles with two letters in them reads as placeholder data, not a roster. This is the single highest-leverage trust fix available on the site.

**Button hierarchy was genuinely broken before this session's pass** (flat navy vs. gradient blue vs. outline, used interchangeably for "primary" actions across pages) — fixed today by unifying `.button-primary` (blue gradient) and `.button-dark` (navy gradient) into one visual family so there's no ambiguity about what a "strong" action looks like. Still worth a second pass once real usage data exists: right now almost every dashboard action button is visually "important" (bordered, hoverable), which means nothing is.

**The search affordance is a bare magnifying-glass glyph with no label, no placeholder text, no visible search field** — it's a Link styled as an icon that jumps straight to `/papers`. A first-time visitor has no way to know clicking it doesn't open a search box; it's a full navigation.

**Login/Register live only in a 12px-font top strip.** On mobile that strip truncates to "International Peer-Reviewed Open Access Jo…" and the auth links survive, but they're competing with copyright-bar-tier visual weight for what should be one of the most important conversion actions on the entire site for a returning user.

---

## PASS 2 — First-Time User Walkthrough

*Clicking through cold, reporting confusion as it happens.*

1. **Land on homepage.** Nice hero, clear headline, I get what this is in 2 seconds. Good badge up top ("Trusted by 500+ researchers") — that's reassuring.
2. I scroll to "Latest Articles" expecting to see, well, articles. It says "No published papers are available at this time." Okay... so is this journal actually active? The badge said 500+ researchers use this. Small doubt creeps in.
3. I go back up and click **"View Current Issue"** because I want to see what a published issue looks like before I trust this with my own paper. It says "Loading current issue..." and then just... stops. Nothing loads. I don't know if it's broken or if there's genuinely no current issue. I'd bounce here if I weren't testing this on purpose.
4. Let me try the other button instead: **"Submit Manuscript."** I'm immediately thrown onto a login screen — "Sign in to your account." I haven't registered yet, and nothing told me submitting requires an account first. I have to notice the small "Create a free account" link myself. A little friction, recoverable, but I wanted to see the *submission form* before committing to creating an account — I still don't know what fields, file types, or fees (if any) are involved.
5. I click "Create a free account" instead. **The Register form is genuinely nice now** — clean two-column layout, clear labels, Google sign-up option. No complaints here. I do notice I have to pick a role (Author/Reviewer/Editor) with no explanation of what each means or whether I can change it later — a little uncertain, but not a blocker.
6. Back to exploring without an account. I click **"About Us."** Good, readable page now — dark, legible text, clear sections. I notice it says the journal started in **2026**. Wait, didn't the homepage say "trusted by 500+ researchers worldwide" like this has been running for years? That's a little confusing / slightly untrustworthy, but I keep going.
7. **Editorial Board page** — I want to see who's actually running this thing before I'd trust it with a submission. Every single member is a blue circle with two initials. No photos, no way to visually distinguish anyone. It still lists real names, titles and institutions though, which helps, but it feels more like a placeholder page than a "these are real people" page.
8. I scroll to the bottom of Editorial Board and there's a "Interested in Joining the Editorial Board?" banner — **I couldn't read this earlier in testing** (it rendered as barely-visible dark text on a dark blue background) — that's now fixed and readable.
9. I try the **hamburger menu on my phone.** Menu opens fine, all the nav links are there, but I don't see a Login or Register option in the menu itself — I have to close the menu and go hunting in the thin dark bar above the logo. Took me a second to find it.
10. I open **Browse Papers** to search for something in my field. Clean search bar and dropdown filter, but typing anything just returns "No published papers found matching your search" — I can't tell if that's because nothing exists yet in this field or the search itself doesn't work. Either way, I leave without confidence that this journal has an active back catalog.

**Net first-time-user verdict:** the *visual* experience is now genuinely modern and pleasant — the hero, the auth screens, the typography all read as professional. The thing that would make me hesitate to actually submit my research here is that literally every "show me the content" path (Latest Articles, Current Issue, Browse Papers, Editorial Board photos) currently dead-ends or feels like a placeholder. Design fixed the surface; the site still needs real content/data behind it to close the sale.

---

## CRITICAL (fixed this session)

- [x] Header brand block overlapped the primary nav on medium/desktop widths (unreadable, "huge" text stacking over "Home"). **Fixed** — removed the redundant full descriptive title from the nav bar entirely (logo + "IJEPA" wordmark only); full name still appears in the top bar, hero, and footer.
- [x] Editorial Board's "Interested in Joining?" callout heading and body text were rendering near-invisible (dark navy text on a dark navy/blue gradient) due to a CSS specificity collision between `.page-body h2`/`.page-body p` and `.callout h2`/`.callout p` — the generic content-page rule was silently winning and repainting white text as navy. **Fixed** by scoping an explicit override.
- [x] Global body/paragraph text color (`--muted`, `--ink`) was too light for comfortable reading. **Fixed** — darkened both tokens site-wide.
- [x] Button color language was inconsistent (flat navy vs. gradient blue used interchangeably as "the important button"). **Fixed** — `.button-dark` and `.button-primary` now share one gradient-and-shadow family so "strong action" reads consistently everywhere.

## CRITICAL (still open — needs product/data decisions, not just CSS)

- [ ] **Every "prove it" content section is empty** (Latest Articles, Current Issue, Browse Papers, Journal Issues archive) because there's no live backend data connected. This is the single biggest credibility and conversion risk on the site — worse than any visual issue.
- [ ] **Both primary hero CTAs currently dead-end** for a cold visitor (login wall / empty issue page). At minimum, "Submit Manuscript" should show what's involved before demanding an account, and "View Current Issue" needs either real data or to be swapped for a working link until there is one.
- [ ] **"Starting Year: 2026" contradicts "Trusted by 500+ Researchers Worldwide."** Reconcile the story before a skeptical visitor catches it.
- [ ] Backend (`backend/.env`) still has a placeholder `SUPABASE_URL` — nothing in the app (login, paper data, notifications) can actually work end-to-end locally until this is wired to a real project.

## HIGH IMPACT

- Editorial Board has no member photos — every card is an identical initials circle. For a trust-dependent page, this is the highest-leverage content fix available.
- Footer social row is literal text characters ("in 𝕏 f ▶"), not icons — reads as an unfinished template.
- Search affordance in the header is an unlabeled magnifying-glass icon that silently navigates to Browse Papers rather than opening a search field — no visible feedback for a first-time user.
- Login/Register are only accessible from the 12px top utility bar (which truncates its own text on mobile) — not present in the mobile hamburger menu at all. Move auth actions into the main mobile nav.
- No trust signals beyond a static badge: no institution logos, no sample paper preview, no citation/read counts. Even one real published paper linked from the homepage would do more for conversion than any layout change.
- Forms (Login/Register/Submit) surface errors only as a single banner at the top — no inline per-field validation feedback (e.g., "passwords don't match" only appears after full submit).

## NICE TO HAVE

- Admin Dashboard's PDF viewer modal uses a visually distinct shadow/overlay style (`.paper-modal-*`) from the rest of the app's modals (`.modal-panel-*`) — cosmetic-only difference, could be unified.
- Register's role selector ("Author / Reviewer / Editor") has no explanatory copy about what each role means or whether it's changeable later.
- Hero "Trusted by 500+ Researchers Worldwide" badge has no source/link — consider making it clickable to a testimonials or stats page once that content exists.
- Dashboard action buttons (edit/assign/delete/etc.) are visually uniform in weight — once real usage patterns are known, consider demoting rarely-used actions to reduce visual noise in tables.
