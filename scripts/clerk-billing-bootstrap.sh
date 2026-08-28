#!/usr/bin/env bash
# Bootstrap Clerk Billing (Development instance) without `clerk link`.
# Requires Clerk CLI login as a user with access to agro-ai-auth (Raw Code's projects).
set -euo pipefail

APP_ID="app_3IThUPXYe9TeXFToApdAlaB3OC2"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "→ Clerk auth (use the account that owns agro-ai-auth / Raw Code's projects)…"
npx clerk@latest auth login

echo "→ Apps visible to this account:"
if ! npx clerk@latest apps list 2>&1; then
  echo ""
  echo "If you do not see agro-ai-auth, run:"
  echo "  npx clerk auth logout && npx clerk auth login"
  echo "and sign in with me@juliovela.com (or get invited to Raw Code's projects)."
  exit 1
fi

echo "→ Enable Billing for organizations (Development, no link required)…"
npx clerk@latest enable billing \
  --for orgs \
  --app "$APP_ID" \
  --instance dev \
  --yes \
  --no-skills

echo "→ Seed org plans + features (dry-run first)…"
npx clerk@latest config patch \
  --app "$APP_ID" \
  --instance dev \
  --file docs/ops/clerk-billing-plans.json \
  --dry-run

read -r -p "Apply plan patch? [y/N] " ans
if [[ "${ans,,}" == "y" ]]; then
  npx clerk@latest config patch \
    --app "$APP_ID" \
    --instance dev \
    --file docs/ops/clerk-billing-plans.json \
    --yes
fi

echo ""
echo "Done. Next:"
echo "  1. Dashboard → agro-ai-auth → Development → Configure → Webhooks"
echo "     URL: https://stg.geoagro.ai/api/webhooks/clerk"
echo "     Events: subscriptionItem.active|updated|ended|canceled|expired|abandoned"
echo "  2. whsec_… → Vercel Preview CLERK_WEBHOOK_SIGNING_SECRET"
echo "  3. Billing → Plans → attach Features to each org plan (per-plan section)"
