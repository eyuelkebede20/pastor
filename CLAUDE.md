# CLAUDE.md — Pastor: QR + Link-in-Bio Platform

> **Full auto mode.** This file is the single source of truth. Any Claude instance (Claude Code, Cursor, etc.) working in this repo should read this file first, follow the phases in order, and never invent scope beyond it. When a decision is ambiguous, pick the simplest option that ships on Vercel free tier.

---

## 1. What we are building

**Pastor** is a minimal, fast, three-tool web platform:

| #   | Tool                           | One-line job                                                                                                                   |
| --- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **QR Generator**               | Turn any URL/text into a downloadable QR code (PNG + SVG), with light customization                                            |
| 2   | **QR Reader**                  | Decode QR codes from the device camera or an uploaded image — fully client-side                                                |
| 3   | **Link Page (linktree clone)** | Signed-in users store links and get a public page at `pastor.app/u/username`, with a matching QR code and short shareable link |

**Non-goals (do not build):** payments, teams, custom domains, themes marketplace, email campaigns, mobile apps, admin dashboards. Keep it lean.

**Design mandate from the owner:** pages must be _very simple and clear_. One tool per page, one obvious primary action per page, minimal chrome.

---

## 2. Stack (fixed — do not substitute)

| Layer             | Choice                                                                       | Why                                                                                          |
| ----------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Framework         | **Next.js 15 (App Router, TypeScript)**                                      | First-class Vercel deploy, server actions, edge redirects                                    |
| Styling           | **Tailwind CSS v4**                                                          | No component library needed for this scope; hand-rolled UI stays simple                      |
| DB                | **Postgres via Neon** (Vercel Marketplace integration)                       | One-click provisioning from the Vercel dashboard, serverless driver, free tier               |
| ORM               | **Drizzle ORM** + `drizzle-kit` migrations                                   | Type-safe, already the house standard                                                        |
| Auth              | **better-auth** (email + password, Google OAuth optional later)              | House standard, works with Drizzle adapter                                                   |
| QR generation     | **`qr-code-styling`** (client) + **`qrcode`** (server, for og/social images) | Styling lib gives dots/colors/logo overlay; `qrcode` is dependency-free for server rendering |
| QR reading        | **`@zxing/browser`**                                                         | Camera + image decode, pure client-side, no data leaves the device                           |
| Validation        | **zod**                                                                      | Shared schemas between forms and server actions                                              |
| Analytics (links) | Simple click counter in Postgres (no external service)                       |                                                                                              |

Node 20+, pnpm.

---

## 3. Repository layout

```
pastor/
├── CLAUDE.md                  ← this file
├── drizzle/                   ← generated migrations (committed)
├── drizzle.config.ts
├── src/
│   ├── app/
│   │   ├── layout.tsx         ← global shell: logo, 3-tab nav, footer
│   │   ├── page.tsx           ← landing: three big cards → the three tools
│   │   ├── qr/
│   │   │   ├── generate/page.tsx
│   │   │   └── scan/page.tsx
│   │   ├── links/page.tsx     ← authed dashboard: manage your link page
│   │   ├── u/[username]/page.tsx      ← PUBLIC link-in-bio page
│   │   ├── r/[slug]/route.ts          ← short-link redirect + click count (edge)
│   │   ├── api/auth/[...all]/route.ts ← better-auth handler
│   │   ├── api/og/[username]/route.ts ← social preview image w/ QR
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── components/            ← QRCanvas, ScannerView, LinkRow, CopyButton…
│   ├── db/
│   │   ├── schema.ts
│   │   └── index.ts           ← neon-http drizzle client
│   ├── lib/
│   │   ├── auth.ts            ← better-auth server config
│   │   ├── auth-client.ts
│   │   ├── slugs.ts           ← nanoid(7) short-slug helper
│   │   └── validators.ts      ← zod schemas
│   └── actions/               ← server actions (links CRUD, profile)
├── public/
├── vercel.json
├── .env.example
└── scripts/deploy.sh          ← the automated deploy path (§8)
```

---

## 4. Database schema (Drizzle)

better-auth generates its own `user`, `session`, `account`, `verification` tables via its Drizzle adapter — run `npx @better-auth/cli generate` and keep them in `schema.ts`. Add:

```ts
// profiles: 1-to-1 with better-auth user
export const profiles = pgTable("profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  username: varchar("username", { length: 30 }).notNull().unique(), // ^[a-z0-9_]{3,30}$
  displayName: varchar("display_name", { length: 60 }).notNull(),
  bio: varchar("bio", { length: 160 }),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// links: the linktree entries
export const links = pgTable(
  "links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 80 }).notNull(),
    url: text("url").notNull(), // validated https?:// via zod
    position: integer("position").notNull(), // manual ordering, 0-based
    isActive: boolean("is_active").default(true).notNull(),
    clicks: integer("clicks").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("links_user_idx").on(t.userId)],
);

// short_links: sharable short URLs (used for profile pages AND arbitrary URLs)
export const shortLinks = pgTable("short_links", {
  slug: varchar("slug", { length: 12 }).primaryKey(), // nanoid(7)
  targetUrl: text("target_url").notNull(),
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }), // nullable → anonymous allowed
  clicks: integer("clicks").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

Rules:

- Username reserved words: `qr`, `links`, `login`, `signup`, `api`, `u`, `r`, `admin`, `og`.
- Max **50 links per user**, max **30 anonymous short links per IP per day** (enforce in the server action with a simple count query; good enough for v1).
- Click counting: `UPDATE ... SET clicks = clicks + 1` fire-and-forget inside the redirect route (`waitUntil` if available, otherwise await — Neon is fast enough).

---

## 5. Feature specs

### 5.1 QR Generator — `/qr/generate` (no auth required)

One column, top to bottom:

1. **Input** — a single large textarea/URL input. Tabs above it: `URL` · `Text` · `Wi-Fi` · `vCard`.
   - Wi-Fi tab → fields SSID / password / encryption → serialize to `WIFI:T:WPA;S:{ssid};P:{pass};;`
   - vCard tab → name / phone / email → serialize a minimal `BEGIN:VCARD … END:VCARD`
2. **Live preview** — QR renders instantly on every keystroke via `qr-code-styling` into a canvas (debounce 150 ms).
3. **Customize row** (keep it to exactly these four controls, nothing more):
   - Foreground color (color input, default `#111111`)
   - Background color (default `#FFFFFF`)
   - Dot style: `square | rounded | dots`
   - Optional center logo upload (client-side only, `FileReader` → dataURL, warn it lowers scannability, force error correction `H` when a logo is set; otherwise `M`)
4. **Actions**: `Download PNG` (1024×1024) · `Download SVG` · `Copy image` (Clipboard API, PNG blob).
5. If the input is a URL and the user is on this page, show a subtle secondary action: **“Shorten & get QR”** → calls the short-link server action, swaps the encoded content to `https://{host}/r/{slug}`, shows the short link with a copy button. Works anonymously.

Everything here is client-side except the optional shorten action. No QR content is ever stored.

### 5.2 QR Reader — `/qr/scan` (no auth, 100% client-side)

Two side-by-side options (stacked on mobile):

- **Camera scan**: button `Start camera` → `@zxing/browser` `BrowserQRCodeReader.decodeFromVideoDevice` into a `<video>` element. On decode: stop the stream, show result.
- **Upload image**: file input / drag-and-drop → `decodeFromImageUrl`.

**Result card** shows the decoded text with:

- `Copy` button
- If it parses as a URL → an `Open link` button **that shows the full URL first** (anti-phishing: never auto-redirect)
- If it parses as `WIFI:` → pretty-print SSID/password
- `Scan another` reset button

Handle and message these errors explicitly: camera permission denied, no camera found, no QR found in image. State clearly on the page: _“Scanning happens on your device. Nothing is uploaded.”_

### 5.3 Link page (linktree) — `/links` dashboard + `/u/[username]` public

**Onboarding:** after signup, if no profile row exists, `/links` shows a single inline form: pick username (live availability check via server action, lowercase, debounced) + display name → create profile.

**Dashboard `/links` (auth required):**

- Header card: avatar (URL input for v1 — no file storage), display name, bio, and the public URL `pastor.app/u/{username}` with `Copy link` and `Show QR` (modal, reuses the QRCanvas component, downloadable).
- Link list: each row = drag handle (reorder via `position`, use plain HTML drag events or up/down arrow buttons — arrows are acceptable v1), title, URL, active toggle, click count badge, edit, delete.
- `+ Add link` → inline form (title + URL, zod-validated `https?://`).
- All mutations are server actions with `revalidatePath`.

**Public page `/u/[username]`:**

- Server component. 404 → friendly “this page doesn’t exist yet — claim it” with signup CTA.
- Avatar, display name, bio, then active links ordered by `position` as full-width tappable buttons.
- Link buttons point to `/r/{slug}`? No — simpler: link buttons hit a tiny `POST /api/click` beacon (`navigator.sendBeacon`) then navigate, OR just route them through `/r/` slugs created per link. **Decision: route every link through an auto-created short link** (`shortLinks` row created when the link is created, deleted with it). One counting mechanism, no beacon code.
- Footer: tiny “Made with Pastor” linking to `/`.
- `generateMetadata`: OG title/description + OG image from `/api/og/[username]` (uses `qrcode` `toDataURL` + `@vercel/og` ImageResponse: name on the left, page QR on the right).
- `export const revalidate = 60` on this page.

### 5.4 Short-link redirect — `/r/[slug]`

Route handler: look up slug → increment clicks → `redirect(targetUrl, 302)`. Unknown slug → redirect to `/` with `?notfound=1` toast. Validate at creation time that the target is `http(s)` and not pointing back at `/r/` (loop guard).

---

## 6. Pages, nav, and design system

**Nav (global, sticky, one row):** `Pastor` wordmark · `Generate` · `Scan` · `My Links` · (right side) `Log in` or avatar menu with `Log out`. That is the entire navigation of the product.

**Landing `/`:** one heading, one sentence, three equal cards (Generate / Scan / Link page), each with an icon, 2-line description, and a button. No hero animation, no testimonials, no pricing section.

**Design tokens** (define in `globals.css` as CSS variables; every component uses them):

- `--bg: #FAFAF8` (paper white) · `--surface: #FFFFFF` · `--ink: #16181D` · `--muted: #6B7280`
- `--accent: #0E7C66` (deep viridian — the “scan success” green family; used for primary buttons, focus rings, active toggles) · `--accent-ink: #FFFFFF`
- `--danger: #C2402A`
- Radius `12px` cards / `8px` controls · border `1px solid #E5E5E0` · shadows: none or barely-there. Flat, crisp, module-like — the aesthetic of the product _is_ the QR module grid: crisp squares, high contrast, generous whitespace.
- Type: **Space Grotesk** for headings (geometric, pairs with QR blockiness), **Inter** for body, `ui-monospace` for decoded text/slugs. Load via `next/font`.
- Signature element: section headings get a small 3×3 QR-corner “finder square” glyph (pure CSS, 12px) to the left. That is the one decorative flourish; nothing else.
- Accessibility floor: visible focus rings (`--accent`), all controls labeled, `prefers-reduced-motion` respected, contrast ≥ 4.5:1.

**Simplicity rules (hard):** max one primary button per screen, no modals except the QR preview modal, no toasts longer than one sentence, mobile-first (test at 375 px).

---

## 7. Environment variables

`.env.example` (commit this; never commit `.env`):

```bash
DATABASE_URL=            # Neon pooled connection string
BETTER_AUTH_SECRET=      # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

In production the two URLs become the Vercel deployment URL. `NEXT_PUBLIC_APP_URL` is what gets encoded into profile QRs and short links.

---

## 8. Automated Vercel deploy path

The whole path from clean clone to production is **three commands**. Keep it that way.

### 8.1 One-time setup (human does this once)

1. Create GitHub repo, push.
2. `vercel.com/new` → import repo → framework auto-detected as Next.js.
3. In the Vercel project: **Storage → Create Database → Neon (Marketplace)**. This auto-injects `DATABASE_URL` into all environments.
4. Add `BETTER_AUTH_SECRET` (generate locally), and set `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` to the production URL in Project → Settings → Environment Variables.

### 8.2 `scripts/deploy.sh` (committed, executable)

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "▸ Type check"
pnpm exec tsc --noEmit

echo "▸ Lint"
pnpm lint

echo "▸ DB migrations → production"
# pulls prod env, runs drizzle migrations against Neon
vercel env pull .env.production.local --environment=production --yes
DOTENV_CONFIG_PATH=.env.production.local pnpm exec drizzle-kit migrate

echo "▸ Deploy"
vercel --prod --yes

echo "✔ Deployed."
```

Requires `npm i -g vercel` and one interactive `vercel link` on first run — after that, `pnpm deploy` (alias the script in `package.json`) is fully non-interactive.

### 8.3 Continuous deploy (default path)

Because the repo is imported into Vercel, **`git push` to `main` = production deploy** and every PR gets a preview URL automatically. Migrations for the CI path: add a `vercel.json` build command that runs migrations before build:

```json
{
  "buildCommand": "pnpm exec drizzle-kit migrate && pnpm build"
}
```

(Drizzle migrations are idempotent; safe on every deploy.)

### 8.4 Local dev

```bash
pnpm install
cp .env.example .env    # fill in a Neon dev branch DATABASE_URL
pnpm exec drizzle-kit migrate
pnpm dev
```

---

## 9. Build phases (execute in order, commit per phase)

Each phase ends with the app running (`pnpm dev`) and type-clean (`tsc --noEmit`).

- **Phase 0 — Scaffold.** `create-next-app` (TS, Tailwind, App Router, src dir), fonts, CSS tokens, global layout + nav + landing page with three cards (links can 404 for now). `vercel.json`, `.env.example`, `deploy.sh`.
- **Phase 1 — QR Generator.** `/qr/generate` complete per §5.1 minus the shorten action. Pure client feature; no DB needed yet.
- **Phase 2 — QR Reader.** `/qr/scan` complete per §5.2. Test camera on a phone via `pnpm dev --experimental-https` or a Vercel preview (camera requires HTTPS).
- **Phase 3 — DB + Auth.** Drizzle + Neon client, better-auth with Drizzle adapter, schema + first migration, `/login`, `/signup`, session in nav.
- **Phase 4 — Short links.** `shortLinks` table live, `/r/[slug]` redirect + counter, anonymous “Shorten & get QR” action wired into the generator.
- **Phase 5 — Link dashboard.** Profile onboarding, `/links` CRUD + reorder + active toggle + per-link auto short links.
- **Phase 6 — Public page.** `/u/[username]`, metadata + OG image route, click counts flowing.
- **Phase 7 — Polish & ship.** Empty states, error states, mobile pass at 375 px, Lighthouse ≥ 90 on `/` and `/u/*`, then `pnpm deploy`.

---

## 10. Conventions for Claude working in this repo

- Server actions live in `src/actions/`, always `"use server"`, always zod-parse input, always check `auth.api.getSession` before touching user rows.
- Never expose `userId` in client props when `username` will do.
- No new dependencies without adding them to §2 with a one-line justification.
- Every schema change = a new drizzle-kit migration, committed. Never edit old migrations.
- QR reading stays client-side forever — it is a privacy feature, not an implementation detail.
- Copy style: sentence case, plain verbs (“Download PNG”, “Start camera”, “Add link”), errors say what happened and what to do next.
- When unsure between two UI options, choose the one with fewer elements on screen.
