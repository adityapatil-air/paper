# IJEPA — Audit V3 (Phase 1: audit only, no code changed)

**Date:** 2026-09-24 · **Commit audited:** `7591f29` (clean working tree) · **Env:** local — CRA `:3000`, Express `:4000`, Supabase **dev** project `xwwoinsgvxgeaksqxtdq` (production is `vvtpfaohltoeevwicrnv`; production was **not** touched or probed).
**Method:** clicked through every flow in the in-app browser as guest / author / reviewer / admin, checked every write via the network log, checked storage and DB state with `curl`, read the code for root causes. Breakpoints 1440 / 1024 / 768 / 375.

## Verdict

The redesign looks professional on the surface: consistent tokens, decent dashboards, good modal and focus handling, no layout breakage at any width. Underneath, **it is not safe to run with real manuscripts.**

- **Nothing is protected.** Anyone with the public anon key, which ships in every visitor's browser, can read every user's **password hash** straight from Supabase.
- **Anyone can make themselves admin** at registration.
- **The live JWT secret is on GitHub.**
- **Authors see each other's papers** because ownership is guessed from first names.
- **Anyone can replace anyone's manuscript.**

Several public claims are also false or unsupported: CrossRef DOIs, double-blind review, "500+ researchers", and a contact form that sends nothing. The lifecycle mostly *works mechanically*, but it has no "accepted" state, and payment is disconnected from the paper.

**The reported reviewer-assignment bug did NOT reproduce on this commit.** Details are in §3. I have not invented a root cause.

---

## 1. Lifecycle table

| Step | Role | Result | Evidence |
|---|---|---|---|
| A1.1 Register new author | guest | **PASS** | `POST /api/auth/register` → user id 5, auto-login to `/author-dashboard`. No email verification. Live password-mismatch hint works. |
| A1.2 Log out | author | **PASS** | `authToken` + `user` removed from localStorage, redirected to `/` |
| A1.3 Log in, wrong password | guest | **PASS** | Inline "Invalid credentials", password kept |
| A1.4 Log back in | author | **PASS** | → `/author-dashboard`; empty state has a clear CTA |
| A1.5 Refresh keeps session | any | **FAIL** | `location.reload()` removes `user` from localStorage (`authToken` stays) and bounces to `/login`. Reproduced 2/2. See P1-01. |
| A1.6 Forgot password | guest | **FAIL** | The Login link goes to `/forgot-password`, which isn't routed. The catch-all `App.js:98` sends it to `/`. There is no reset endpoint in `routes/auth.js` (only `/register`, `/login`). |
| A2.1 Author submits `/submitform` with PDF | author | **PASS** | `POST /api/submissions` → 200, paper #6. Inline validation works (150–300-word abstract, live counter); review-before-submit modal; draft autosave. |
| A2.2 File in Supabase Storage | — | **PASS** | `GET pdf_url` → `200 application/pdf`, 407 B (bucket is **public**, see P1-03) |
| A2.3 `papers.pdf_url` set | — | **PASS** | `/api/papers/6` → `pdfUrl=…/user-5/manuscripts/…audit-manuscript-v1.pdf` |
| A2.4 Paper in author dashboard | author | **PASS** (policy FAIL) | Row shown. But **"Pay now" appears immediately**, before review. See P1-06. |
| A3.1 Admin "Submit new paper" modal | admin | **PASS** | `POST /api/submissions` → 200, paper #7 |
| A3.2 File in storage | — | **PASS** | 200 `application/pdf`. Stored under `anonymous/`, so it's linked to no author (P2-08). |
| A3.3 `pdf_url` set / listed in dashboard | admin | **PASS** | "All submissions 6" |
| A4.1 Assign reviewer: Manage modal → Assign | admin | **PASS** | `POST /api/admin/assign-reviewer` → **200**; status `submitted` → `under_review`; `assignedReviewers: [3]`; counters 3→2 / 0→1 |
| A4.2 Assign reviewer: Pending tab → Assign | admin | **PASS** (not submitted) | Modal opens, reviewer listed, click and keyboard selection work, Tab trap, Esc closes, focus returns. Cancelled before submitting to avoid touching a non-test paper. |
| A5.1 Reviewer sees assigned paper | reviewer | **PASS** | Paper #2 listed, "Review pending" |
| A5.2 Reviewer PDF viewer | reviewer | **PASS** | react-pdf canvas, "Page 1 of 5", "Confidential review copy" watermark. Console: react-pdf TextLayer/AnnotationLayer CSS missing (P2-10). |
| A5.3 Submit review | reviewer | **PASS** | Empty submit shows 3 inline errors and focuses the first. Filled submit → toast "Review submitted successfully."; counters update. |
| A5.4 Reviewer limited to own assignments | reviewer | **FAIL** | `/review/paper/4` (not assigned) renders the full unpublished manuscript. See P1-02. |
| A6.1 Admin reads review | admin | **PASS** | Reviews modal: 4/5, "Accept with minor revisions", comments |
| A6.2 Request revision | admin | **PASS** | `POST /api/admin/request-revisions` → 200 (`revisions_requested` migration is applied) |
| A6.3 Author uploads revised file | author | **PASS mechanics / FAIL authz** | `POST /api/submissions/2/revision` → 200, **uploaded by an account that doesn't own the paper**. See P0-06. The editor's message isn't shown in the upload modal (P1-11). |
| A6.4 Admin accepts | admin | **FAIL** | No accept action or state exists. The enum is `submitted, under_review, published, rejected` (+ `revisions_requested`). See P1-07. |
| A6.5 Payment | author | **SKIPPED** | Can't be tested in Razorpay test mode: backend key is the placeholder (`/api/payments/key` → `"YOUR_RAZORPAY_KEY_ID"`). The UI opens a hardcoded hosted link `https://rzp.io/rzp/dOBF1Tdq` with no paper linkage. **Not opened**, because it may be live-mode. See P1-06. |
| A6.6 Publish | admin | **PASS mechanics** | Confirm dialog → `POST /api/admin/publish-paper` → 200. Assigned DOI `10.1000/example.2026.002` (fake, P1-08). Payment still `pending`; no warning. |
| A7.1 Create issue (text + file + cover) | admin | **PASS** | `POST /api/issues` → 200. File and cover each `200` from storage. |
| A7.2 Set as current | admin | **PASS** | Via "Set as current issue" checkbox → `isCurrent: true`. The separate "Set current" button was not clicked. |
| A7.3 Assign paper to issue | admin | **PASS** | `POST /api/issues/5/assign-paper` → 200. Default selection is the **wrong** issue (P2-06). |
| A7.4 `/journal-issues` | guest | **PASS** | Current issue, cover, file, paper list |
| A7.5 Home "Current Issue" | guest | **PASS** | Cover (alt text), description, PDF link, "In this issue (1)" |
| A8.1 Browse / search papers | guest | **PASS** (UX issues) | Search "admin" finds the paper, but results are hidden in a collapsed accordion (P2-13) |
| A8.2 Paper page `/paper/:slug`, `/p/:id` | guest | **FAIL** | Shows only "Paper #2" + "Invalid PDF structure." **for valid PDFs too** (paper 1). No title, abstract, or metadata. See P1-09, P1-10. |
| A8.3 PDF download from paper page | guest | **FAIL** | `/api/papers/2/download?download=1` on :3000 → `200 text/html` (the SPA's index.html) |
| A8.4 Editorial board | guest | **PASS** | Renders; 8 images, all with alt. 42 text nodes under 12px. |
| A8.5 Contact form | guest | **FAIL** | Shows "Message sent successfully!" after **0 network requests** (fetch and XHR hooked). See P1-12. |
| A8.6 Call for papers / Join us / About | guest | **PASS** | Render, no broken images or links |
| A8.7 Guidelines downloads | guest | **PASS** | Template `.docx` 139,808 B; Copyright `.pdf` 28,170 B, both 200 |
| A8.8 Indexing | guest | **PASS render / FAIL content** | Claims CrossRef membership (P1-08) |
| A8.9 Privacy / Terms | guest | **PASS** (render only) | Content not legally reviewed |
| A8.10 404 | guest | **FAIL** | No 404 page. `/this-page-does-not-exist` → `/`; `/paper/does-not-exist-xyz` → `/journal-issues` |
| A9 Console / network / speed | all | **Mixed** | Console: only react-pdf CSS warnings (24× on viewer pages). No 4xx/5xx seen. API median 228–491 ms per call. Admin dashboard loads ~6 **sequential** round-trips plus 1 request per paper (P2-01). |

---

## 2. Security checks (Part B), with repro commands

1. **No token on `/api/admin/*`:** `curl http://localhost:4000/api/admin/reviewers` → `HTTP 200` + reviewer name and email. None of the 6 routes in `backend/src/routes/admin.js` (lines 18, 103, 126, 172, 240, 311) use `requireAdmin`, which exists at `middleware/requireAdmin.js` and **is** used correctly in `routes/issues.js:103–470`. Mounted bare at `index.js:57`.
2. **Other routes missing auth:** papers (`DELETE /:id`, `POST /`, `GET /`, `GET /:id`, `GET /:id/download`), reviews (all 3), submissions (both), settings (both POSTs), notifications (all 3), payments (`create-order`, `verify-payment`). Details in §4.
3. **Can an author see another author's paper?** **YES**, proven live (P0-05).
4. **Can a reviewer see unassigned papers?** **YES**, proven live (P1-02). Also via `GET /api/papers` with no login at all.
5. **File type / size:**
   - Client: SubmitForm checks extension, 20 MB limit, and empty files (`SubmitForm.js:109–121`). Admin modal accepts PDF only; author form accepts PDF/DOC/DOCX (inconsistent).
   - Server: multer 20 MB limit (`storage.js:5,148`), but the filter checks **extension only** (`storage.js:96,153`) and stores the **client-supplied** MIME type (`storage.js:112`).
6. **Secrets in the frontend bundle:** **clean.** The dev bundle (4.9 MB) contains none of `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, or `RAZORPAY_KEY_SECRET` (checked by value). Only `REACT_APP_*` vars are referenced; the Supabase key is `sb_publishable_…` (allowed). **But see P0-02: RLS is off, so the publishable key reads everything.**
7. **Secrets in git:** `backend/.env copy` is tracked and pushed to `origin/main` and `origin/dev`. Its `JWT_SECRET` **matches the live backend value** (sha256 compared, not printed). The Razorpay secret in it differs from the current one.

---

## 3. "Admin assigns reviewer — known broken": investigation

**Result: not reproduced on `7591f29`.** I tried both entry points and the keyboard path. On each I checked the network call (200), the DB state (`status=under_review`, `assignedReviewers=[3]`), and that the reviewer can see the paper.

Each suspect you listed:

| Suspect | Finding | Evidence |
|---|---|---|
| `openAssignReviewer` (~1007) | OK. It clears `managePaper`, sets `selectedPaper`, resets search, and opens the modal in one batch. | `AdminDashboard.js:1007–1013` |
| `handleAssignReviewer` (~440) | OK. Guards, `assigning` flag, toast, reload. | `AdminDashboard.js:440–461` |
| Assign modal (~1975) | OK. Selection works (`aria-pressed`), button enables, footer submits. | `AdminDashboard.js:1974–2039` |
| Old click-outside on `dropdownRef` (~405) | **Dead code, harmless.** It only calls `setIsDropdownOpen(false)`, and the state value is thrown away (`const [, setIsDropdownOpen]`). Nothing reads it. | `AdminDashboard.js:133, 406–418` |
| Manage modal closing before Assign opens | OK. Only one dialog is in the DOM after the swap; body overflow is restored; no stacking. | Live DOM check: `openDialogs` 1 → 0 on close, `bodyOverflow ""` |
| `Modal.js` focus / overlay | OK. Tab wraps inside the dialog, Esc closes, focus returns to the trigger, and the overlay covers the viewport. | `Modal.js:37–100`; live: Tab ends on "Close dialog" inside the dialog; Esc → focus on the trigger |

**Real defects in this path that would make assignment *look* broken:**

- **P2-04: "Assign more reviewers" silently no-ops.** The picker never excludes reviewers already assigned (`AdminDashboard.js:862–874`). The backend treats a duplicate (`23505`) as success (`admin.js:144–150`). With one reviewer in the system, a second "assignment" shows a success toast and changes nothing.
- **P1-01: a refresh logs the admin out.** In dev, any reload mid-task lands on `/login`.
- **P1-13: the reviewer is never told.** There's no email anywhere in the backend, so a reviewer only finds the assignment if they log in.

**Needed from you:** the exact repro (which button, what you saw: no modal, empty list, error toast, or no change), the browser, and whether it was local or production. If it was production, it may be running a different build or backend.

---

## 4. Issues

Severity: **P0** blocker · **P1** major · **P2** minor · **P3** polish. "Live" means reproduced in the browser or with curl in this session.

### P0: blockers

| ID | Sev | Page / route | What is wrong | Evidence | Fix proposal |
|---|---|---|---|---|---|
| P0-01 | P0 | `/api/admin/*` | All 6 admin routes are unauthenticated. Anyone can publish, reject, request revisions, assign reviewers, replace manuscript files, and list reviewer PII. | Live: `curl …/api/admin/reviewers` → 200 + email. `admin.js:18,103,126,172,240,311`; `index.js:57`. `requireAdmin` is never imported in `admin.js`. | `router.use(requireAdmin)` at the top of `admin.js`. Add `...authHeaders()` to every admin call in `src/data/mockData.js:378,799,815,835,855,875`, which currently send no token. |
| P0-02 | P0 | Supabase (all tables) | **RLS is off.** The public anon key, shipped in every visitor's bundle, can read **every user row including `password_hash`**, plus all papers (`pdf_url`, `cover_letter`), reviews, review_assignments, notifications, and issues. Writes are probably open too (not tested, since that would be destructive). | Live PostgREST with the anon key: `users` → 200, 6 rows, cols include `password_hash`; `papers` 200 (6); `reviews` 200; `notifications` 200. No `enable row level security` / `create policy` in any `.sql` file. | Enable RLS on every table with no anon policies (the backend uses the service role, which bypasses RLS). **Check production `vvtpfaohltoeevwicrnv` immediately**; I didn't probe it. |
| P0-03 | P0 | `POST /api/auth/register`, `/register` | Anyone can **self-register as `admin`**, `reviewer`, or `editor`. The server accepts the role from the body and signs it into the JWT, which then passes `requireAdmin`. The UI also offers Reviewer and Editor. | `auth.js:46–48` (`allowedRoles` includes `'admin'`), `auth.js:69`; `Register.js:199–201`. Code-proven; I didn't create an admin account. | Force `role='author'` on self-registration. Reviewers and editors get invited or promoted by an admin. Remove the "Register As" select. |
| P0-04 | P0 | repo / auth | The **live `JWT_SECRET` is committed and pushed** (`backend/.env copy` on `origin/main` and `origin/dev`), so anyone can forge an admin token. There's also a hardcoded fallback secret if the env var is unset. | `git ls-files` shows `backend/.env copy`; sha256 of `JWT_SECRET` matches `backend/.env`. `requireAdmin.js:4`, `auth.js:8` fallback `'super-secret-dev-key-change-me'`. `.gitignore` misses `.env copy`. | Rotate `JWT_SECRET` (logs everyone out) and the Razorpay secret. Delete the file and add `*.env*` / `.env copy` to `.gitignore`. Purge history (needs your decision; it rewrites history). Fail closed when `JWT_SECRET` is missing. |
| P0-05 | P0 | `/author-dashboard` | **Ownership is guessed by first-name substring.** An author sees every paper where any author name *contains their first name*, with Details (PDF), Upload revision, and Pay now. Real authors who type their name differently on the form never see their own paper. | Live: a new account "Test Probe" (submitted nothing) sees **3** papers: #2 "Test Admin Author", #6 "Audit Test Author", #1 "Test Author". `AuthorDashboard.js:68–69`. `/api/papers` doesn't even return `main_author_id`. | Return only the caller's papers from the server (`main_author_id = req.user.id`, token required) and drop the client filter. |
| P0-06 | P0 | `POST /api/submissions/:id/revision` | **Anyone can replace any paper's manuscript** while it's in `revisions_requested`. No auth, no ownership check. The old file URL is overwritten, and the admin notification says "uploaded by the author". | Live: "Test Probe" uploaded to paper #2 → 200; `pdfUrl` now `…/user-6/revisions/…audit-revision-v2.pdf`. `submissions.js:209–351`, `:260`, `:327`. | Require a token; allow only when `papers.main_author_id === req.user.id`. Keep previous versions (P2-07). |
| P0-07 | P0 | `DELETE /api/papers/:id`, `POST /api/papers` | Unauthenticated **permanent delete** of any paper. `POST` creates papers with client-supplied `paymentStatus` (e.g. `paid`) and `mainAuthorId`. | `papers.js:16–45` (no auth, hard delete); `papers.js:257–322` (`paymentStatus` from body at 269/280/291). Not executed. | `requireAdmin` on DELETE (prefer soft-delete). Require auth on POST; the server sets `payment_status='pending'` and the author comes from the token. |
| P0-08 | P0 | `POST /api/reviews` | Unauthenticated **review injection**: `reviewerId` and `reviewerName` come from the body, with no check that the reviewer is assigned. That corrupts peer review. | `reviews.js:85–124` (108–109) | Require a reviewer token; derive `reviewerId` from it; check `review_assignments`; one review per assignment. |

### P1: major

| ID | Sev | Page / route | What is wrong | Evidence | Fix proposal |
|---|---|---|---|---|---|
| P1-01 | P1 | all (auth) | **A refresh logs you out** (dev: every time; prod build: a race). The StrictMode first mount's `init()` resolves after cleanup (`isMounted=false`), skips the restore branch, and runs `setUser(null)` + `removeItem('user')`. The token is left orphaned. | Live 2/2: after reload, localStorage keys = `authToken, probe` and the page is `/login`. `AuthContext.js:84–89`; `index.js:8` StrictMode. | Only restore or clear when `isMounted` (return early otherwise); never remove storage from a stale effect. Validate the token via a `/api/auth/me` endpoint. |
| P1-02 | P1 | `/review/paper/:id` | A reviewer can open **any** manuscript, including unassigned and unpublished ones. | Live: reviewer opened `/review/paper/4` ("Intelligent Land Record…", 3 pages). `ReviewPaper.js:33` fetches with no check; the guard is role-only at `App.js:81–85`. | Server: `GET /api/papers/:id` / download returns 403 unless admin, author, or assigned reviewer. Client: redirect if not assigned. |
| P1-03 | P1 | `GET /api/papers`, `/:id`, `/:id/download`, Storage | Unpublished manuscripts are public: the list and detail return every status including `pdf_url` with no login, and the bucket is public. | Live: `curl /api/papers` → 4 papers incl. `submitted`; `pdf_url` → 200 with no auth. `papers.js:93,154,217`; `storage.js:66` (public bucket). | Public list = published only. Other statuses need auth plus a role check. Private bucket with short-lived signed URLs for unpublished files. |
| P1-04 | P1 | `/forgot-password` | The link exists and the feature doesn't. The user is dumped on the homepage with no message. | Live → `/`. `Login.js` link; `App.js:98`; no endpoint in `auth.js`. | Build a reset flow (token plus email), or remove the link until it exists. |
| P1-05 | P1 | `/api/settings/*` POST, `/api/notifications/*` | Settings writes are unauthenticated (anyone can deface the editorial board or important dates). Notifications: read anyone's by `?userId=`, mark read, or **delete** by id. | `settings.js:42,96`; `notifications.js:25,59,92` | `requireAdmin` on settings POSTs. Notifications: user from token, scoped `where user_id = req.user.id`. |
| P1-06 | P1 | `/author-dashboard` "Pay now", `/api/payments/*` | The payment flow is disconnected and contradicts policy. "Pay now" opens a hardcoded hosted link with **no paper id**, so no payment can ever mark a paper paid. It shows **right after submission**, while the Guidelines say "pay only after acceptance, INR 1500". The backend `create-order` defaults to ₹150, takes the amount from the client, and `verify-payment` marks any `paperId` paid from any valid order. | `AuthorDashboard.js:17,20,120–122`; `AuthorGuidelines.js:117–121`; `payments.js:28,53–104`; live `/api/payments/key` → placeholder | Show payment only for `accepted`. Create the order server-side from the paper's fee with `receipt=paper_<id>`; verify the order→paper mapping; use `timingSafeEqual`. |
| P1-07 | P1 | Admin workflow | No **accepted** state. Admin goes straight to "Publish", which is offered even on a `submitted` paper with 0 reviewers. The publish confirmation doesn't mention unpaid status. | Schema enum `supabase_schema.sql:15`; Manage modal on paper #2 (0 reviewers) showed "Publish paper"; `admin.js:172–238` has no status precondition | Add `accepted` (and `in_production`). Publish only from `accepted` + paid (or waived). Warn in the confirm dialog. |
| P1-08 | P1 | `/indexing`, published papers | **Fake DOIs with a CrossRef claim.** Publishing assigns `10.1000/example.<year>.<id>` (the DOI Handbook's example prefix, which never resolves), while `/indexing` says "Currently Indexed In… CrossRef" and "assigned a unique DOI… through our CrossRef membership". Listing ResearchGate and Academia.edu as "indexing" is padding. | `admin.js:199`; live paper #2 DOI `10.1000/example.2026.002`; Indexing page text | Don't display a DOI until one is actually registered with CrossRef under the journal's prefix. Remove the CrossRef claim until membership is real. Drop social sites from "Indexed in". |
| P1-09 | P1 | `/paper/:slug`, `/p/:id` | **The PDF viewer and Download are broken for valid PDFs** wherever the API isn't same-origin. Relative `/api/...` URLs ignore `REACT_APP_API_URL`, so pdf.js receives `index.html` and shows "Invalid PDF structure." Works only behind the Nginx same-origin setup; breaks on the Render setup (`backend/render.yaml`). | Live: `/p/1` and `/p/2` → "Invalid PDF structure."; `fetch('/api/papers/2/download')` → `200 text/html`. `PaperRedirect.js:68–69`. | Build URLs with `API_BASE_URL`. Show a proper error state with a fallback download link. |
| P1-10 | P1 | `/paper/:slug` | The article page has **no article**: no title, authors, affiliations, abstract, keywords, DOI, dates, license, or cite. There are no `citation_*` meta tags (Google Scholar can't index it, though `/indexing` claims Scholar), and `<title>` is generic. | Live text: "Back to Journal Issues / Paper #2 / Download / Prev Next…"; meta present: only 4 `og:*` | Render full metadata in HTML above the viewer. Add Highwire `citation_*` meta, a per-paper `<title>`, a canonical URL, and a BibTeX/RIS export. |
| P1-11 | P1 | Author "Upload revision" modal | The author isn't shown **what to revise**. The editor's note and reviewer comments are missing from the modal where they act. | Live modal text: generic "Upload a revised version in response to reviewer and editor comments." | Show the editor message and reviewer comments (without reviewer identity) in the modal and in Details. |
| P1-12 | P1 | `/contact-us` | **The contact form is fake.** It waits 1.5 s, says "Message sent successfully! We'll get back to you soon.", and the message goes nowhere. | Live: 0 fetch/XHR requests. `ContactUs.js:26–31` ("Replace with real API call in production") | Wire it to a real endpoint or email, or replace it with a `mailto:` link and remove the form. |
| P1-13 | P1 | backend | **No email at all.** Reviewers aren't told about assignments; authors aren't told about revision requests or decisions. "Revision request sent to the author" means an in-app notification only. | `grep` for nodemailer/sendgrid/resend/smtp/mailgun in `backend/` → none | Add transactional email for assignment, revision request, decision, and publication. |
| P1-14 | P1 | Submit success page, review viewer | The **"double-blind peer review"** claim is false. The reviewer viewer and dashboard show author names. | SubmitForm success text: "Suitable manuscripts go to double-blind peer review"; live `/review/paper/2` shows "AUTHORS Test Admin Author" | Hide author identity from reviewers (and require anonymised manuscripts), or change the claim to single-blind. |
| P1-15 | P1 | `/`, `/login` | "Trusted by **500+** Researchers Worldwide" is unverifiable; the DB has 6 users. | `Landing.js:52`, `Login.js:76` | Remove, or replace with real counts pulled from data. |
| P1-16 | P1 | `/api/auth/login`, `/register` | No rate limiting or lockout, so password brute force and registration spam are possible. | No rate-limit package in `backend/` | `express-rate-limit` on the auth routes. |

### P2: minor

| ID | Sev | Page / route | What is wrong | Evidence | Fix proposal |
|---|---|---|---|---|---|
| P2-01 | P2 | `/admin-dashboard` | Slow and chatty loading: 6 **sequential** awaits plus one `/api/reviews/paper/:id` per paper (N+1); notifications fetched twice; the whole dashboard reloads after every action. That's about 1.7 s minimum at ~250 ms per call, and it grows with the number of papers. | `AdminDashboard.js:144–180`, duplicate fetch at `:169` and `:429`; network log | `Promise.all` independent calls; one endpoint returning reviews grouped by paper; refresh only what changed. |
| P2-02 | P2 | all | No code splitting: the homepage downloads the admin dashboard, react-pdf, and pdf.js. | `App.js`: 0 `lazy()`; react-pdf imported in 4 pages | `React.lazy` for dashboards and viewer pages. |
| P2-03 | P2 | Admin nav, Register | The `editor` role is a dead end: registerable, but no dashboard; ProtectedRoute sends editors to `/`. Role is trusted from client localStorage. | `ProtectedRoute.js:24–27,31–34`; `AuthContext.js:70–85` | Remove `editor` until it exists. Get the role from a verified `/me`. |
| P2-04 | P2 | Assign reviewer | Already-assigned reviewers are offered again; a duplicate returns success and the toast lies. | `AdminDashboard.js:862–874`; `admin.js:144–150` | Filter out assigned reviewers (show them as "Assigned"); return 409 on duplicate. |
| P2-05 | P2 | Review form | "Reject with major revisions" is contradictory (the standard term is "Major revision"). No confidential comments-to-editor field. Reviewer deadline is always "—". | Live form values `accept, accept_with_revisions, reject_with_revisions, reject`; reviewer table Deadline "—" | Accept / Minor / Major / Reject; add a confidential editor comment field; set a deadline on assignment. |
| P2-06 | P2 | Assign to issue | Pre-selects `issues[0]` (old Vol 12) instead of the current issue, which invites mis-assignment. | Live select `1:Volume 12… (SELECTED)`; `AdminDashboard.js:721–722` | Pre-select the current issue, or none. |
| P2-07 | P2 | Revisions | A revision overwrites `pdf_url`: no version history, and the editor can't compare. A published paper still shows the "Revised manuscript received" badge. | `submissions.js:260`; live Manage modal on published #2 | Store versions in `paper_files`; clear the badge on decision. |
| P2-08 | P2 | Admin submit modal | Admin-submitted papers are stored under `anonymous/` and linked to no author, so no author can ever manage them. The admin modal accepts PDF only and a 5-word abstract, while the author form requires PDF/DOC/DOCX and 150–300 words. | Live paper #7 path `anonymous/manuscripts/…`; admin modal `accept=".pdf"` | Link to an author account (by email invite); share one validation schema. |
| P2-09 | P2 | Submit form | No **category or subject** field, so every paper shows "Category —" and the Browse "Section" filter does nothing. The guidelines require a signed copyright form, but the author form has no upload for it. | Live: fields list; `/api/papers/6` `category: null`; `AuthorGuidelines.js:107,133` | Add a required subject select; add a copyright upload (or request it at acceptance). |
| P2-10 | P2 | PDF viewers | react-pdf TextLayer/AnnotationLayer CSS is never imported, so text selection and links render unstyled. | Console: 24× "TextLayer styles not found" / "AnnotationLayer styles not found"; no `react-pdf/dist/*.css` import in `src` | Import both CSS files once. |
| P2-11 | P2 | Links site-wide | Brand link colour `--blue:#087de5` on white is **4.14:1**, which fails WCAG AA (4.5:1). It's used for all links, the active nav item, and the 11px editorial-board emails. | Computed contrast; `index.css:7` | Darken the text-use blue (e.g. ~`#0a6acb`, ≥ 4.5:1) and keep `#087de5` for fills. |
| P2-12 | P2 | Site-wide | **Text under 12px is systemic**: buttons 11.5px, form labels 11.5px, editorial board 10.5–11px (42 nodes), paper toolbar 10px, `.article-tag` 10.5px. | Computed font sizes at 1440; `index.css:56,91,103,106,122–124,156,175,214,222,226–227,244,252,259`; `BrowsePapers.js:335,341` (9–10px) | Set a 12px floor (13–14px for buttons and labels). |
| P2-13 | P2 | `/papers` | Search results are **hidden in collapsed accordions**; the toggle is a tiny "▾" with no `aria-expanded`; no result count. Inputs have no associated `<label>`. Dates are "9/24/2026" here and "Sep 24, 2026" elsewhere. | Live: after search only "Vol. 1 Issue 9 ▾" visible; `labels.length=0` on both controls; `BrowsePapers.js:244,255,288` | Expand groups that contain matches; show "N results"; add `aria-expanded`; `htmlFor`/`id`; one date formatter. |
| P2-14 | P2 | `/journal-issues` archive | Issue cards are clickable `<div>`s with no role or tabindex, so they can't be reached by keyboard. | Live: `role=null, tabIndex=-1`; `JournalIssue.js:251` | Use `<button>` or `<a>`. |
| P2-15 | P2 | `/contact-us` | Labels are not associated with inputs. | `ContactUs.js:108,121,134,147` | `htmlFor`/`id`. |
| P2-16 | P2 | 375px admin | Sidebar nav turns into a horizontal scroller (336 of 1,108 px visible); "Pending assig…" is cut off and 5 sections are off-screen with no cue. | Live measurement `NAV.admin-nav 336/1108` | Use a select or dropdown on mobile, or a scroll fade and arrows. |
| P2-17 | P2 | Header ≤1024px | The hamburger is a text glyph "☰" with a **23px-wide** tap target (below WCAG 2.2's 24px, far below 44px), and Esc doesn't close the menu. | Live: size `[23,42]`; menu still open after Escape | 44×44 icon button; close on Esc and on route change. |
| P2-18 | P2 | Header, Footer | Social links go to the platform homepages (`linkedin.com`, `x.com`, `facebook.com`, `youtube.com`), not journal profiles. | `Header.js:42–44`, `Footer.js:18–21` | Link real profiles or remove the icons. |
| P2-19 | P2 | Routing | No 404 page; unknown routes and bad slugs redirect silently. | Live; `App.js:98`; PaperRedirect bad slug → `/journal-issues` | Add a real 404 page; "Paper not found" on bad slugs. |
| P2-20 | P2 | All pages | Every page has the same `<title>`, which hurts SEO, tabs, and history. | Live `document.title` identical on `/paper/…` and others | Per-route titles. |
| P2-21 | P2 | `/register` | No email verification (anyone can register someone else's address); password minimum 6; validation mostly only on submit. | Live registration → instant login; `Register.js:31–57` | Verify email; minimum 8 plus a strength hint; validate on blur. |
| P2-22 | P2 | `/reviewer-dashboard` | A failed fetch shows "No papers assigned for review", a false empty state. | `ReviewerDashboard.js:67` (catch only logs) | Show an error state with Retry. |
| P2-23 | P2 | Server uploads | File filter is extension-only and the MIME type is client-trusted, so a renamed payload passes. | `storage.js:96,112,153` | Check magic bytes (e.g. `file-type`); set content-type server-side. |

### P3: polish

| ID | Sev | Page / route | What is wrong | Evidence | Fix proposal |
|---|---|---|---|---|---|
| P3-01 | P3 | code | Dead code: `PaperCard.js` and `PaperViewer.js` (never imported or routed); click-outside handler; mock users with `password123` shipped in the bundle. | `grep` imports → none; `AdminDashboard.js:133,406–418`; `mockData.js:40–50` | Delete. |
| P3-02 | P3 | Inline styles | Hardcoded hex colours and px sizes bypass the tokens. | `ContactUs.js:101`; `BrowsePapers.js:335,341,345`; `PaperRedirect.js:113,117,163,167`; `Login.js:123,131`; `Register.js:130,247,255,263`; `joinusedito.js:36,43` | Move into classes that use the tokens. |
| P3-03 | P3 | Issue data | Month stored lowercase ("december"); "Volume 12 Issue 12" conflicts with the journal's Vol 1. Homepage says "Quarterly", yet a PDF says "Issue 12". | Live `/api/issues` id 1 | Fix the data; validate the month server-side. |
| P3-04 | P3 | Emails | `editorial@ijepa.org` on one page, `editor@ijepa.org` everywhere else. | `EditorialBoard.js:227` | Pick one. |
| P3-05 | P3 | 375px header | The top utility bar truncates to "…Open Access Journal \|" (a stray pipe); ISSN and publisher are hidden. | Live screenshot at 375 | Hide the bar or show only ISSN on mobile. |
| P3-06 | P3 | 375px home | The decorative orbit graphic takes about half the first screen below the CTAs. | Live screenshot at 375 | Hide or shrink it under 600px. |
| P3-07 | P3 | 1024px home | The five-item facts strip wraps 3 + 2 (orphan row). | Live screenshot at 1024 | Use a 5-column or auto-fit grid. |
| P3-08 | P3 | Submit form | Affiliation isn't prefilled although the profile has one. | Live: `affiliation` empty for user id 5 | Prefill from the profile. |
| P3-09 | P3 | Admin | After every action, `loading=true` swaps the dashboard to a skeleton (a flash). | `AdminDashboard.js:142` | Use a background refresh flag. |
| P3-10 | P3 | Filenames | `joinusedito.js` breaks the PascalCase page convention. | `App.js:24` | Rename to `JoinEditorialTeam.js`. |

---

## 5. Top 10: fix first

1. **P0-02:** Turn on RLS for every Supabase table (password hashes are world-readable). **Verify production today.**
2. **P0-04:** Rotate `JWT_SECRET` (and the Razorpay secret), remove `backend/.env copy`, fix `.gitignore`, fail closed when the secret is missing.
3. **P0-01:** `requireAdmin` on all `/api/admin/*`, plus `authHeaders()` on every admin call in `mockData.js`.
4. **P0-03:** Registration always creates `author`; remove the role picker.
5. **P0-06 / P0-07 / P0-08:** Auth and ownership on revision upload, paper delete/create, and review submit.
6. **P0-05:** Author papers returned by the server by `main_author_id` (end the first-name matching).
7. **P1-02 / P1-03 / P1-05:** Reviewer and guest access control on papers and downloads, a private bucket, and locked-down settings and notifications.
8. **P1-01:** The refresh-logout bug in `AuthContext.js:84`.
9. **P1-09 / P1-10:** Paper page: fix the PDF URL base and render real article metadata with `citation_*` tags.
10. **P1-06 / P1-07 / P1-08 / P1-12 / P1-14 / P1-15:** Fix the workflow (an `accepted` state; payment after acceptance and tied to the paper) and remove every false claim (fake DOIs and CrossRef, double-blind, "500+", fake contact form).

---

## 6. Versus a modern journal (MDPI / Elsevier article pages)

Where IJEPA looks amateur, plainly:

- **The article page is a bare PDF widget.** MDPI and Elsevier render the title, authors with affiliations and ORCID, the abstract, keywords, received/revised/accepted/published dates, licence (CC BY), a resolving DOI, a "Cite" export (BibTeX/RIS), metrics, and HTML full text. IJEPA shows "Paper #2", and in this environment an error.
- **DOIs don't resolve.** `10.1000/example…` in production would be an immediate credibility failure.
- **Indexing and trust signals are padded.** ResearchGate and Academia.edu are listed as indexes, with an unverifiable "500+ researchers". The reputable journals list only real indexes, with links to the journal's own records.
- **The process isn't visible.** There's no public editorial timeline (median time to decision), no peer-review model stated correctly, and no retraction or corrections policy page.
- **Communication.** Established systems email at every stage; IJEPA sends nothing.
- **Machine-readability is missing:** no `citation_*` meta, no per-page titles, no sitemap entries per article. Google Scholar inclusion depends on these.

What is already at that level: dashboard structure, the submission wizard (validation, autosave, review step), modal accessibility, and responsive layout with no overflow at any tested width.

---

## 7. Test data I created in the dev DB (not cleaned up; awaiting your instruction)

- **Users:** id 5 `audit-author-20260924@ijepa-demo.com` (author); id 6 `audit-leak-20260924@ijepa-demo.com` "Test Probe" (author).
- **Paper #6** (author submission) and **#7** (admin modal), both `[AUDIT TEST]`, status `submitted`.
- **Paper #2** `[TEST] E2E admin submission`:
  - reviewer 3 assigned, and one review added;
  - revision requested;
  - `pdf_url` replaced with user 6's file;
  - published (DOI `10.1000/example.2026.002`) and assigned to issue 5.
- **Issue #5** `[AUDIT TEST] Audit Issue` (Vol 1, Issue 9), **set as current**, so Vol 12 Issue 12 is no longer current.
- **Storage objects:**
  - `user-5/manuscripts/…audit-manuscript-v1.pdf`
  - `user-6/revisions/…audit-revision-v2.pdf`
  - `anonymous/manuscripts/…audit-admin-v1.pdf`
  - `issues/vol1-issue9/…`
- **Also:** notifications generated by the steps above.

## 8. Checked and excluded (false alarms and corrected agent claims)

- The "blank white band at top" in screenshots was a capture artifact of the browser pane: the DOM overlay covered 0–720 px and the band always equalled `scrollY`.
- The Register "Sign up with Google" button is outside the `<form>` (`Register.js:258` vs `:262`), so it doesn't submit the form.
- `/SubmitForm` casing (`AuthorGuidelines.js:103`) works: React Router v6 matching is case-insensitive (verified live).
- The claim that the "data layer is entirely mock" is wrong: `mockAPI` calls the real backend via `fetch`.
- `/indexing` does **not** claim Scopus, WoS, or DOAJ indexing; those are listed under "in progress".
- **Not tested:** Google OAuth (would need a real Google account and consent grant), live Razorpay, email flows (none exist), the "Set current" button (only the checkbox was used), editorial-board and important-dates editing.
