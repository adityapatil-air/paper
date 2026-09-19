# IJEPA — UX Audit v2 (Post-Fix Review)

This is a follow-up pass on `UX_AUDIT.md`. Everything in that file's "CRITICAL (fixed this session)" list was already done before that report was written. Since then, the backend has been wired to a real Supabase project (schema + editorial board data now live), and the fixable HIGH IMPACT items below have been implemented. Scope: same click-through (Landing, Login/Register, About, Editorial Board, Footer, mobile nav, Browse Papers, Submit Manuscript) re-tested on desktop and 375px mobile.

---

## PASS 1 — The Ruthless Founder (re-review)

Better. Still not done.

**The trust-badge/empty-content contradiction is now half-solved.** Editorial Board is real data now — 11 named people with real titles and institutions, pulled live from the database. That's the single highest-leverage trust fix from the last audit, and it's done. But Latest Articles, Current Issue, and Browse Papers are *still* empty — not because they're broken, but because nobody has submitted or published a paper into this fresh database yet. The badge still oversells what a first-time visitor can verify. That's not a code problem anymore, it's a "go get 3 real submissions or stop claiming 500+ researchers" problem.

**Footer and top-bar social icons are real SVGs now**, properly sized, hover states added. That placeholder-template smell is gone. Minor: they still point to generic `linkedin.com` / `x.com` / `facebook.com` root URLs, not this journal's actual profile pages — swap those in whenever the real accounts exist. A stub link is honest; a link to nowhere disguised as a real one is not.

**Login/Register no longer live exclusively in a thin top strip.** They're now in the mobile hamburger menu as full-width buttons, and the "Submit Manuscript" login-wall now explains itself ("Sign in (or create a free account) to submit your manuscript — it only takes a minute.") instead of dropping a stranger on a bare form. That's the single biggest first-time-user friction point from the last pass, meaningfully softened.

**Register's role picker now explains itself inline** ("Submit your own manuscripts for review." / "Review manuscripts assigned to you by editors." / "Manage submissions and assign reviewers.") — the ambiguity flagged last time is gone. I did *not* add a "you can change this later" claim, because that feature doesn't exist in the codebase — inventing it would have been the exact kind of unearned trust claim this audit keeps flagging elsewhere. If role changes should be possible, that's a real feature to build, not a line of copy to add.

**Password confirmation now gives live feedback** ("Passwords don't match yet.") instead of only surfacing on submit — small, but it's one less round-trip to failure.

**The modal-style inconsistency flagged as Nice-to-Have is actually already gone** — the PDF viewer modal and the generic dashboard modals now share the same overlay color, corner radius, and shadow depth as a side effect of the design-system pass. No action needed here anymore.

**Still unresolved, and still not a CSS problem:**
- "Starting Year: 2026" next to "Trusted by 500+ Researchers Worldwide" — this is a business/copy decision, not something I'll silently rewrite. Pick the real story (either the badge or the founding year needs to change) and say the word.
- No sample paper, no institution logos, no citation counts — still zero third-party proof beyond the (now real) Editorial Board names.
- Backend can serve real data now, but the moment someone actually submits a manuscript, that's the true test — nobody has run that path end-to-end yet.

---

## PASS 2 — First-Time User Walkthrough (re-review)

1. Homepage — same strong first impression as before, unchanged.
2. Latest Articles — still empty. Unchanged (data problem, not a fix I can make up).
3. **Editorial Board** — this time I actually recognize these as real people. Named titles, real-looking institutions, working profile links. This reads like a credible board now, not a placeholder.
4. I click **Submit Manuscript** logged out. This time the login screen tells me *why* I'm here before asking for credentials — "Sign in (or create a free account) to submit your manuscript." That answered my confusion from last time immediately.
5. I open the **mobile menu** — Login and Register are right there now as clear buttons at the bottom of the menu, no more hunting in the top strip.
6. On **Register**, I pick "Reviewer" out of curiosity and a line appears telling me what that role actually does before I commit. That's exactly the missing context from before.
7. I deliberately mistype my confirm-password — it tells me immediately, in red, before I even hit submit.
8. Footer — real recognizable social icons instead of stray letters. Doesn't change my trust in the *content*, but it stops the "is this actually finished?" doubt those letters caused.
9. Browse Papers — still returns "No published papers found" for any search. Still can't tell if that's "empty library" or "broken search" from the UI alone. Unchanged — would benefit from copy like "No papers published yet in this category — check back soon" to at least rule out "is this broken."

**Net verdict:** every fixable friction point from the last walkthrough is fixed. What's left is entirely a content/data problem — the site now honestly *shows* what it has; it just doesn't have much yet. That's a publishing-operations problem, not a UX problem.

---

## CHANGELOG SINCE LAST AUDIT

- [x] Backend wired to the real Supabase project (schema created, service role key configured) — login/papers/notifications endpoints now hit a real database instead of crashing on a placeholder URL.
- [x] Editorial Board seeded with 11 real members — no longer initials-only placeholders in terms of *data* (avatars are still initials-in-a-circle, see below).
- [x] Footer social row — real LinkedIn/X/Facebook/YouTube SVG icons, circular hover state.
- [x] Top utility bar social icons — same real-icon treatment, replacing "in 𝕏 f" text glyphs.
- [x] Mobile hamburger menu — Login/Register (or Logout) now included as full-width buttons, no longer hidden in the top strip only.
- [x] Login page — contextual message when redirected from a gated action (currently covers Submit Manuscript; generic fallback for any other redirect).
- [x] Fixed a related latent bug: the post-login redirect target (`from`) only worked when passed as a location object (`ProtectedRoute`'s format); `SubmitForm`'s redirect passed a plain string and was silently ignored. Both formats now work, so logging in from the Submit Manuscript wall correctly returns you to the form.
- [x] Register — role selector now shows a one-line explanation per role (Author/Reviewer/Editor).
- [x] Register — live inline "Passwords don't match yet" feedback instead of submit-only validation.
- [x] Modal visual consistency (PDF viewer vs. generic dashboard modals) — confirmed already unified as a side effect of the earlier design-system rewrite; no further action needed.

## STILL OPEN (product/content decisions, not implementable as pure code fixes)

- [ ] Reconcile "Trusted by 500+ Researchers Worldwide" against "Starting Year: 2026" — pick one true story.
- [ ] Get at least one real (or clearly-marked sample) paper published so Latest Articles / Current Issue / Browse Papers aren't all empty.
- [ ] Point the social icons at this journal's actual profile URLs once they exist (currently generic platform root links).
- [ ] Add real photos to Editorial Board (currently real names/titles, but avatars are still initials-in-a-circle).
- [ ] Consider clarifying empty-search copy on Browse Papers ("No papers published yet" vs. current generic "no results," to rule out "is search broken?").

## NICE TO HAVE (unchanged from last audit, still open)

- Dashboard action buttons are visually uniform in weight — once real usage patterns exist, consider demoting rarely-used actions to reduce table noise.
- Hero trust badge has no link/source — could point to a stats or testimonials page once that content exists.
