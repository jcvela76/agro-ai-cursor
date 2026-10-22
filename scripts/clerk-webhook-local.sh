#!/usr/bin/env bash
# Local Clerk webhooks → Next.js /api/webhooks/clerk (ADR-061 Free bootstrap).
# Prefer Clerk CLI relay over raw ngrok so svix-* headers stay intact.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FORWARD_TO="${FORWARD_TO:-http://localhost:3000/api/webhooks/clerk}"

if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

echo "Free self-serve local webhook"
echo "  Forward to: $FORWARD_TO"
echo ""
echo "1) Arrancá Next: npm run dev"
echo "2) En otra terminal, relay Clerk (recomendado):"
echo ""
echo "   npx clerk@latest webhooks listen --forward-to $FORWARD_TO"
echo ""
echo "   Si pide token: npx clerk@latest webhooks token"
echo "   Añadí la URL impresa (https://webhooks.clerk.com/in/…) como endpoint"
echo "   en Dashboard → Webhooks (Development) con los mismos eventos que stg."
echo "   Copiá el Signing Secret del endpoint → CLERK_WEBHOOK_SIGNING_SECRET en .env.local"
echo ""
echo "Alternativa tunnel genérico:"
echo "   ngrok http 3000"
echo "   Endpoint Dashboard: https://<host>/api/webhooks/clerk"
echo ""
echo "3) Smoke API (sin browser): npm run smoke:free-selfserve"
echo "   Smoke con webhook live: SMOKE_FREE_WAIT_WEBHOOK=1 npm run smoke:free-selfserve"
echo ""
echo "Docs: docs/ops/billing.md § Free self-serve"
