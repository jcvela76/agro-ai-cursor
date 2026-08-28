#!/usr/bin/env bash
# Clerk webhooks (stg / Development): validate key, open Svix dashboard, print event checklist.
# Clerk has no Backend API to CRUD webhook endpoints (/v1/webhooks → 404).
# Manage endpoints in Dashboard → Webhooks (Svix) or via the Svix URL from this script.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

if [[ -z "${CLERK_SECRET_KEY:-}" ]]; then
  echo "CLERK_SECRET_KEY missing. Set in .env.local or export it."
  exit 1
fi

WEBHOOK_URL="${WEBHOOK_URL:-https://stg.geoagro.ai/api/webhooks/clerk}"
CLERK_API_BASE="${CLERK_API_BASE:-https://api.clerk.com/v1}"

EVENTS=(
  subscriptionItem.active
  subscriptionItem.updated
  subscriptionItem.ended
  subscriptionItem.canceled
  subscriptionItem.expired
  subscriptionItem.abandoned
  organization.created
  organizationInvitation.created
)

echo "→ Validating CLERK_SECRET_KEY (Development / sk_test)…"
PROBE=$(curl -sS -w "\n%{http_code}" -H "Authorization: Bearer $CLERK_SECRET_KEY" \
  "$CLERK_API_BASE/users?limit=1")
HTTP_CODE=$(echo "$PROBE" | tail -n1)
BODY=$(echo "$PROBE" | sed '$d')

if [[ "$HTTP_CODE" != "200" ]]; then
  echo "Clerk API rejected the secret (HTTP $HTTP_CODE)."
  echo "$BODY" | head -c 500
  echo ""
  echo ""
  echo "Use the Development secret (sk_test_…) from agro-ai-auth → Development."
  echo "See docs/ops/clerk-billing-manual.md if jcvela@gmail.com CLI lacks access."
  exit 1
fi

echo "  OK — Backend API reachable."

echo "→ Generating Svix dashboard URL…"
SVIX_RESP=$(curl -sS -w "\n%{http_code}" -X POST \
  -H "Authorization: Bearer $CLERK_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "$CLERK_API_BASE/webhooks/svix_url")
SVIX_HTTP=$(echo "$SVIX_RESP" | tail -n1)
SVIX_BODY=$(echo "$SVIX_RESP" | sed '$d')

if [[ "$SVIX_HTTP" != "200" ]]; then
  echo "Could not create Svix dashboard URL (HTTP $SVIX_HTTP)."
  echo "$SVIX_BODY"
  echo ""
  echo "Fallback: Dashboard → agro-ai-auth → Development → Configure → Webhooks"
  exit 1
fi

SVIX_URL=$(echo "$SVIX_BODY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('svix_url',''))")

echo ""
echo "══════════════════════════════════════════════════════════════"
echo " Webhook stg — configuración manual (Svix / Clerk Dashboard)"
echo "══════════════════════════════════════════════════════════════"
echo ""
echo "Endpoint URL:"
echo "  $WEBHOOK_URL"
echo ""
echo "Subscribe to these events (add any missing to the existing endpoint):"
for ev in "${EVENTS[@]}"; do
  echo "  • $ev"
done
echo ""
echo "Signing secret → Vercel Preview + .env.local:"
echo "  CLERK_WEBHOOK_SIGNING_SECRET=whsec_…"
echo ""
echo "Svix dashboard (one-time login link, ~15 min):"
echo "  $SVIX_URL"
echo ""
echo "Clerk Dashboard (alternative):"
echo "  https://dashboard.clerk.com/last-active?path=webhooks"
echo ""

if [[ "${OPEN_BROWSER:-1}" == "1" ]] && command -v open >/dev/null 2>&1 && [[ -n "$SVIX_URL" ]]; then
  echo "→ Opening Svix dashboard in default browser…"
  open "$SVIX_URL" || true
fi

echo "Done. Edit the endpoint for $WEBHOOK_URL and ensure all events above are checked."
