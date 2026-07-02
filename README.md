# Pastor

A minimal, fast, three-tool web platform:

1. **QR Generator** (`/qr/generate`) — turn a URL, text, Wi-Fi network, or vCard into a downloadable QR code (PNG + SVG), with light customization. Optional anonymous short-link.
2. **QR Reader** (`/qr/scan`) — decode QR codes from the camera or an uploaded image, fully client-side. Nothing is uploaded.
3. **Link page** (`/u/[username]`) — signed-in users store links and get a public link-in-bio page with a matching QR code and short shareable links.

See [CLAUDE.md](./CLAUDE.md) for the full product spec.

## Stack

Next.js (App Router, TypeScript) · Tailwind CSS v4 · Postgres (Neon) · Drizzle ORM · better-auth · `qr-code-styling` + `qrcode` · `@zxing/browser` · zod. Node 20+, pnpm.

> Note: scaffolded on Next.js 16 (current stable, App Router). All server code awaits `params`/`searchParams` per the async conventions.

## Local development

```bash
pnpm install
cp .env.example .env.local     # fill in a Neon dev-branch DATABASE_URL + BETTER_AUTH_SECRET
pnpm db:migrate                # apply drizzle migrations
pnpm dev
```

Camera scanning needs HTTPS. Test it with `pnpm dev --experimental-https` or a Vercel preview.

### Environment variables

| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon pooled connection string |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | App origin (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_APP_URL` | App origin — encoded into profile QRs and short links |

## Scripts

- `pnpm dev` / `pnpm build` / `pnpm start`
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm lint` — eslint
- `pnpm db:generate` — generate a new migration from `src/db/schema.ts`
- `pnpm db:migrate` — apply migrations
- `pnpm deploy` — typecheck, lint, migrate prod, deploy (see `scripts/deploy.sh`)

## Deploy

Import the repo into Vercel, add the Neon integration (auto-injects `DATABASE_URL`), and set the auth vars. `vercel.json` runs `drizzle-kit migrate` before every build, so `git push` to `main` deploys and migrates. Migrations are idempotent.
