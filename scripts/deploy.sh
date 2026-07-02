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
