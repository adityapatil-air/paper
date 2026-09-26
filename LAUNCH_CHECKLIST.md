# IJEPA — Launch checklist

Everything needed to take the `testing` branch live on **ijepa.org**. Steps marked **(you)** need an account, a password or a business decision and can't be done from the code.

Stack: React build served by **Nginx**, Express API on port 4000 run by **PM2** (`ecosystem.config.js`), database and file storage in **Supabase** project `xwwoinsgvxgeaksqxtdq`.

---

## 0. Client test deployment: Render (backend) + Vercel (frontend)

Use this for the client's acceptance testing before ijepa.org goes live. **Keep the backend on Render**: Vercel functions reject request bodies over ~4.5 MB, and manuscripts can be up to 20 MB. With this split, uploads go browser → Render → Supabase Storage, and Vercel only serves the static site.

Deploy the **backend first**, because the frontend needs its URL.

### A. Push the branch

```bash
git push origin testing
```

### B. Backend on Render

1. render.com → **New → Web Service** → connect GitHub → pick `adityapatil-air/paper`.
2. Settings:

   | Field | Value |
   |---|---|
   | Branch | `testing` |
   | Root Directory | `backend` |
   | Runtime | Node (the repo pins Node 20 in `backend/package.json`) |
   | Build Command | `npm install` |
   | Start Command | `npm start` |
   | Health Check Path | `/api/health` |
   | Instance type | **Starter ($7/mo) recommended while the client tests.** Free sleeps after 15 min idle and the next request takes ~50 s. |

3. **Environment** (copy from your local `backend/.env`):

   | Key | Value |
   |---|---|
   | `SUPABASE_URL` | `https://xwwoinsgvxgeaksqxtdq.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | from `backend/.env` |
   | `SUPABASE_STORAGE_BUCKET` | `manuscripts` |
   | `JWT_SECRET` | from `backend/.env` |
   | `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay **test** keys (`rzp_test_…`) |
   | `TRUST_PROXY` | `true` |
   | `FRONTEND_ORIGIN` | leave for now; set to the Vercel URL in step D |

   Don't set `PORT`; Render provides it.
4. **Create Web Service**. When it's live, open `https://<name>.onrender.com/api/health`. It should return JSON. Copy this URL.

### C. Frontend on Vercel

1. vercel.com → **Add New → Project** → import `adityapatil-air/paper`.
2. Settings: Framework **Create React App**, Root Directory `./`. Build and output come from `vercel.json` (`npm run build` → `build`), which also rewrites every route to `index.html`, so refreshing `/admin-dashboard` works.
3. **Production Branch:** Project → Settings → Git → set to `testing`. Otherwise Vercel builds `main`.
4. **Environment Variables** (baked in at build time, so redeploy after changing any):

   | Key | Value |
   |---|---|
   | `REACT_APP_API_URL` | `https://<name>.onrender.com` (no trailing slash) |
   | `REACT_APP_SITE_URL` | `https://<project>.vercel.app` |
   | `REACT_APP_SUPABASE_URL` | `https://xwwoinsgvxgeaksqxtdq.supabase.co` |
   | `REACT_APP_SUPABASE_ANON_KEY` | the publishable key from your local `.env` |

5. **Deploy**, then copy the `https://<project>.vercel.app` URL.

### D. Connect them

- [ ] Render → Environment → `FRONTEND_ORIGIN` = the Vercel URL → **Save** (Render redeploys).
- [ ] If `REACT_APP_SITE_URL` was a guess, correct it on Vercel → **Redeploy**.
- [ ] Supabase → **Authentication → URL Configuration** → add `https://<project>.vercel.app/**` to Redirect URLs (needed for "Sign in with Google").
- [ ] Google Cloud Console → OAuth client → add the Vercel URL to **Authorised JavaScript origins**.

### E. Check it yourself before sending the link

- [ ] Home, Journal Issues, Browse Papers and a paper page load, and the PDF opens.
- [ ] Refresh on `/author-dashboard`: no 404.
- [ ] Log in as each of the three client accounts.
- [ ] Submit a **real 10–15 MB DOCX**: it uploads and appears in the admin dashboard.
- [ ] The reviewer downloads the manuscript; the author uploads the copyright form.
- [ ] Pay with a Razorpay test card (`4111 1111 1111 1111`, any future expiry, any CVV); the paper shows as paid.
- [ ] On the free plan, open the site a minute before the client does so the backend is awake.

### F. What to tell the client

- The link and three logins (admin, reviewer, author). Send the passwords separately from the link.
- There are **no emails yet**: every notification appears in the dashboard's bell.
- Start test paper titles with **TEST** so they're easy to delete before launch.
- Payments are in **test mode**: use the test card above; no real money moves.
- The first page load can take up to a minute on the free plan.

---

## 1. Before deploying

- [ ] **(you)** Merge `testing` into `main` and push.
- [ ] **(you)** Decide the open content items: the duplicate July issue and the placeholder DOIs (see `AUDIT_V3.md` → Final status).
- [ ] **(you)** Remove test data from Supabase (demo/audit accounts, leftover test files in Storage). The list is in `AUDIT_V3.md`.
- [ ] **(you)** Create one real admin account (register, then set `role = 'admin'` for that row in Supabase → Table editor → `users`).
- [ ] Regenerate the sitemap so it lists every published paper:
  ```bash
  cd backend && node scripts/build_sitemap.js
  ```

## 2. Server

- [ ] **(you)** A Linux server (VPS) with Node 20, Nginx, PM2 and Certbot installed.
- [ ] Clone the repo to `/root/researchpprs` (the path `ecosystem.config.js` expects), then:
  ```bash
  npm install && cd backend && npm install
  ```

## 3. Environment files (never commit these)

**`backend/.env`**

| Variable | Value |
|---|---|
| `PORT` | `4000` |
| `FRONTEND_ORIGIN` | `https://ijepa.org` |
| `TRUST_PROXY` | `true` (behind Nginx) |
| `SUPABASE_URL` | `https://xwwoinsgvxgeaksqxtdq.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | **(you)** service-role key from Supabase → Settings → API. Server only. |
| `SUPABASE_STORAGE_BUCKET` | `manuscripts` |
| `JWT_SECRET` | **(you)** a fresh 48-byte random hex string: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. The server refuses to start without it. |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | **(you)** **live** keys (`rzp_live_…`). Until these are set, "Pay now" shows "Online payment isn't available yet" and admins can use "Mark fee as paid". |
| `RAZORPAY_WEBHOOK_SECRET` | optional; only if you add the webhook in step 6 |
| `APC_INR` / `APC_USD` | optional; default `1500` / `50` |

**`.env.production`** (repo root, read by `npm run build`)

```
REACT_APP_API_URL=https://ijepa.org
REACT_APP_SITE_URL=https://ijepa.org
REACT_APP_SUPABASE_URL=https://xwwoinsgvxgeaksqxtdq.supabase.co
REACT_APP_SUPABASE_ANON_KEY=<publishable/anon key — safe in the browser; RLS blocks table access>
```

## 4. Build and start

```bash
npm run build                       # frontend → build/
cd backend && pm2 start ../ecosystem.config.js && pm2 save && pm2 startup
```

## 5. Nginx and domain

- [ ] **(you)** Point the domain's DNS: `A` records for `ijepa.org` and `www.ijepa.org` → the server IP.
- [ ] Nginx site: serve `build/` for `/` with `try_files $uri /index.html;` (the app uses client-side routes), and proxy `/api/` to `http://127.0.0.1:4000`. Set `client_max_body_size 25m;` so 20 MB uploads get through.
- [ ] SSL: `sudo certbot --nginx -d ijepa.org -d www.ijepa.org`
- [ ] `sudo nginx -t && sudo systemctl reload nginx`

## 6. Third-party dashboards (you)

- [ ] **Supabase → Authentication → URL Configuration:** Site URL `https://ijepa.org`; add `https://ijepa.org/**` to Redirect URLs.
- [ ] **Google Cloud Console (Google sign-in):** add `https://ijepa.org` to Authorised JavaScript origins. The redirect URI stays the Supabase callback (`https://xwwoinsgvxgeaksqxtdq.supabase.co/auth/v1/callback`).
- [ ] **Razorpay:** switch to Live mode and generate live keys. For USD 50 from international authors, request **International payments** under Account & Settings (needs business KYC and can take several days). Optional webhook: `https://ijepa.org/api/payments/webhook`, events `payment.captured`, with the secret in `RAZORPAY_WEBHOOK_SECRET`.
- [ ] **Supabase backups:** check the plan's daily backups, or schedule a `pg_dump`.

## 7. Smoke test after going live

- [ ] Home, Journal Issues, Browse Papers and a paper page (`/p/<id>`) load over HTTPS; the PDF opens.
- [ ] Register an author → submit a DOCX → it appears in the admin dashboard with the file downloadable.
- [ ] Admin assigns the reviewer → reviewer downloads the manuscript and submits a review.
- [ ] Accept → author uploads the copyright form → pays (or admin marks paid) → publish → add to issue.
- [ ] `https://ijepa.org/sitemap.xml` and `/robots.txt` load. Submit the sitemap in Google Search Console.

## 8. Later

- [ ] **Email notifications** (assignment, decisions, publication, password reset). Needs an email provider (e.g. Resend) and DNS records (SPF/DKIM) on ijepa.org. The in-app notifications and `mailto:` links cover this until then.
- [ ] **Private storage bucket** with signed URLs, so unpublished manuscripts can't be opened by anyone who has a file link.
- [ ] Real DOIs through a CrossRef membership, entered in the publish dialog.
