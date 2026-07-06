# Getting Pastor online

## ✅ LIVE — https://pastor-sepia.vercel.app

### Feature added: vCards (digital ID cards)
- Dashboard at `/cards`: companies → an editable grid of people, columns with
  builtin/custom icons, per-row Download SVG + Copy link + Open.
- Public virtual ID at `/c/{id}` with Save-to-contacts (.vcf), QR, and OG preview.
- Verified end-to-end against the live DB; shipped to production.


- [x] **Code on GitHub** — https://github.com/eyuelkebede20/pastor (public)
- [x] **Database provisioned + migrated** — Neon schema applied, all 7 tables live
- [x] **End-to-end verified** locally: signup → profile → add link → public page →
      `/r/` redirect → click counting. Test data cleaned.
- [x] **Deployed to Vercel** — project `eyuduc-1714s-projects/pastor`, framework
      set to Next.js, deployment protection disabled, env vars set
      (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`).
- [x] **Live smoke test passed** — signup on prod returns 200, OG image renders.

### 🔒 Do this now — rotate the exposed secrets
These were shared in plaintext (chat + `.env`). None reached the public repo, but
rotate them to be safe:
- [ ] GitHub classic token `ghp_…` → https://github.com/settings/tokens (revoke)
- [ ] Neon password → Neon dashboard → Reset password, then update `DATABASE_URL`
      in Vercel (all envs) and `.env`.
- [ ] Vercel token `vcp_…` → https://vercel.com/account/settings/tokens (revoke
      when you no longer need CLI deploys).

### Optional next
- [ ] Add a custom domain (Vercel → Settings → Domains), then update
      `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` to it and redeploy.
- [ ] Auto-deploy on push: connect the GitHub repo in the Vercel project
      (Settings → Git) so `git push` deploys automatically.

### Finish the deploy — pick ONE

**Option 1 — Dashboard import (easiest, no token needed; code is already on GitHub)**
1. Go to https://vercel.com/new and import `eyuelkebede20/pastor`.
2. Before deploying, add env vars (Settings → Environment Variables):
   `DATABASE_URL` (your Neon pooled string), `BETTER_AUTH_SECRET`,
   `BETTER_AUTH_URL` = your prod URL, `NEXT_PUBLIC_APP_URL` = same prod URL.
   (Or add the Neon Marketplace integration to auto-inject `DATABASE_URL`.)
3. Deploy. `vercel.json` migrates automatically before build.

**Option 2 — Give me a working token and I deploy from here**
1. https://vercel.com/account/settings/tokens → **Create Token** → copy the WHOLE value.
2. Replace `VERCELkEY=` in `.env` with it (or paste in chat).
3. Tell me — I'll set env vars + deploy via CLI.

---

_Original checklist below (kept for reference)._

---

## Part A — Code to GitHub  **[YOU — 30 seconds]**

The public repo **already exists**: https://github.com/eyuelkebede20/pastor
(but it's empty — the push was blocked because your `gh` token is a
fine-grained PAT without push access to new repos).

**Fix: re-authenticate `gh` with push scope.** In the Claude prompt, run this
with the `!` prefix so it runs in this session:

```
!gh auth login --web -h github.com -s repo -s workflow
```

- Choose **HTTPS** when asked.
- It shows a one-time code and opens your browser → paste the code → Authorize.

Then tell me "auth fixed" and I'll push (or run it yourself):

```bash
git -c credential.helper='!gh auth git-credential' push -u origin main
```

---

## Part B — Database (Neon)  **[YOU]**

Pick ONE path.

### Path 1 — Neon via Vercel (simplest; do it during Part C)
When your project is in Vercel: **Storage → Create Database → Neon**. Vercel
auto-injects `DATABASE_URL` into all environments. Then skip to Part C.

### Path 2 — Neon directly (works for local dev too)
- [ ] Sign up at https://neon.tech (free tier).
- [ ] Create a project. Copy the **pooled** connection string
      (`postgresql://…@…-pooler.…/neondb?sslmode=require`).
- [ ] Put it in `.env.local` as `DATABASE_URL=…`.
- [ ] Apply the schema:  `pnpm db:migrate`
- [ ] (Optional) run locally to smoke-test signup:  `pnpm dev`

---

## Part B.5 — Get a Vercel API token (so I can deploy for you)  **[YOU — 1 min]**

1. [ ] If you don't have a Vercel account: sign up at https://vercel.com/signup
       (use **Continue with GitHub** — fastest).
2. [ ] Go to https://vercel.com/account/settings/tokens
3. [ ] **Create Token** → name it `pastor-deploy` → Scope: your account →
       Expiration: your choice (e.g. 30 days) → **Create**.
4. [ ] Copy the token (shown only once) and paste it to me in chat.

With that token **plus** a `DATABASE_URL` (Part B), I can run the deploy from
here via the Vercel CLI — no dashboard clicking needed. I'll set the env vars
and deploy. (Secrets you paste are used for the deploy only and never committed;
`.env*` is gitignored.)

---

## Part C — Deploy to Vercel  **[YOU — browser login, OR let me use the token above]**

1. [ ] `vercel login` (opens the browser once).
2. [ ] Import the repo at https://vercel.com/new → it auto-detects Next.js.
       (Or run `vercel link` in this folder.)
3. [ ] If you didn't do Part B Path 2: add the Neon integration now
       (**Storage → Create Database → Neon**) so `DATABASE_URL` is set.
4. [ ] Add the other env vars in **Project → Settings → Environment Variables**
       (Production + Preview + Development):

   | Name | Value |
   | --- | --- |
   | `BETTER_AUTH_SECRET` | *(the secret I generated — see chat)* |
   | `BETTER_AUTH_URL` | your prod URL, e.g. `https://pastor.vercel.app` |
   | `NEXT_PUBLIC_APP_URL` | same prod URL |

5. [ ] Deploy: `git push` (Vercel auto-builds), or `vercel --prod`.
       `vercel.json` runs `drizzle-kit migrate` before every build, so the
       schema is applied automatically. Migrations are idempotent.

---

## Part D — Verify live  **[YOU, ~2 min]**

- [ ] Open the prod URL → landing renders.
- [ ] `/qr/generate` → type a URL, QR appears, Download PNG works.
- [ ] `/qr/scan` → upload a QR image, it decodes. (Camera needs HTTPS — prod has it.)
- [ ] `/signup` → create an account → land on `/links`.
- [ ] Pick a username → add a link → open `/u/<username>` in a private window.
- [ ] Click a link on the public page → returns to your link's URL, and the
      click count on `/links` increments.
- [ ] Check the social preview image loads: `/api/og/<username>`.

---

## After launch (optional)
- [ ] Set `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` to a custom domain if you add one.
- [ ] Enable Google OAuth in `src/lib/auth.ts` (better-auth supports it; add the
      provider + `GOOGLE_CLIENT_ID/SECRET` env vars). Currently email+password only.

---

### What I can do next if you say the word
- Create the GitHub repo and push (Part A).
- Once you paste a `DATABASE_URL` here, run `pnpm db:migrate` and a local
  end-to-end smoke test (signup → link → public page → click count).
