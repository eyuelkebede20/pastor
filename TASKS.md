# Getting Pastor online

The app is fully built, committed on `main`, and passes build + typecheck + lint.
What's left is infrastructure: a database, a host, and env vars. Below, **[ME]**
= things I can do from here, **[YOU]** = things that need your account or a
browser. Total time: ~15 minutes.

---

## Part A — Code to GitHub  **[ME, with your OK]**

`gh` is already logged in as `eyuelkebede20`. I can run this for you:

```bash
gh repo create pastor --private --source=. --remote=origin --push
```

- [ ] Decide **private** or **public**, then let me create + push (or run it yourself).

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

## Part C — Deploy to Vercel  **[YOU — browser login]**

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
