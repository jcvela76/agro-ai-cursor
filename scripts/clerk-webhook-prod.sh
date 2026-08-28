#!/usr/bin/env bash
# Clerk webhooks (Production / geoagro.ai): validate sk_live, open Svix dashboard, print checklist.
# Does NOT enable Stripe live or Clerk Billing Production — only wires the webhook endpoint.
# Clerk has no Backend API to CRUD webhook endpoints (/v1/webhooks → 404).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# shellcheck source=scripts/clerk-webhook-events.sh
source "$ROOT/scripts/clerk-webhook-events.sh"

if [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

if [[ -z "${CLERK_SECRET_KEY:-}" ]]; then
  echo "CLERK_SECRET_KEY missing. Export sk_live_… from Clerk Production or set in .env.local."
  exit 1
fi

if [[ "${CLERK_SECRET_KEY}" != sk_live_* ]]; then
  echo "Warning: CLERK_SECRET_KEY does not look like Production (expected sk_live_…)."
  echo "Use the Production secret from agro-ai-auth → Production, not Development."
  if [[ "${ALLOW_DEV_KEY:-0}" != "1" ]]; then
    exit 1
  fi
fi

WEBHOOK_URL="${WEBHOOK_URL:-https://geoagro.ai/api/webhooks/clerk}"
CLERK_API_BASE="${CLERK_API_BASE:-https://api.clerk.com/v1}"

echo "→ Validating CLERK_SECRET_KEY (Production / sk_live)…"
PROBE=$(curl -sS -w "\n%{http_code}" -H "Authorization: Bearer $CLERK_SECRET_KEY" \
  "$CLERK_API_BASE/users?limit=1")
HTTP_CODE=$(echo "$PROBE" | tail -n1)
BODY=$(echo "$PROBE" | sed '$d')

if [[ "$HTTP_CODE" != "200" ]]; then
  echo "Clerk API rejected the secret (HTTP $HTTP_CODE)."
  echo "$BODY" | head -c 500
  echo ""
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
  echo "Fallback: Dashboard → agro-ai-auth → Production → Configure → Webhooks"
  exit 1
fi

SVIX_URL=$(echo "$SVIX_BODY" | python3 -c "import json,sys; print(json.load(sys.stdin).get('svix_url',''))")

echo ""
echo "══════════════════════════════════════════════════════════════"
echo " Webhook Production — configuración manual (Svix / Clerk)"
echo "══════════════════════════════════════════════════════════════"
echo ""
echo "Endpoint URL:"
echo "  $WEBHOOK_URL"
echo ""
echo "Subscribe to these events (add any missing to the endpoint):"
clerk_webhook_print_events
echo ""
echo "Signing secret → Vercel Production ONLY:"
echo "  CLERK_WEBHOOK_SIGNING_SECRET=whsec_…"
echo ""
echo "Also confirm Vercel Production env:"
echo "  NEXT_PUBLIC_APP_URL=https://geoagro.ai"
echo ""
echo "Note: This does NOT enable Clerk Billing live / Stripe Production."
echo "      Org member-limit events work once the endpoint is live."
echo ""
echo "Svix dashboard (one-time login link, ~15 min):"
echo "  $SVIX_URL"
echo ""
echo "Full runbook: docs/ops/clerk-webhook-production.md"
echo ""

if [[ "${OPEN_BROWSER:-1}" == "1" ]] && command -v open >/dev/null 2>&1 && [[ -n "$SVIX_URL" ]]; then
  echo "→ Opening Svix dashboard in default browser…"
  open "$SVIX_URL" || true
fi

echo "Done. After saving, smoke: invite member on geoagro.ai org at member cap."
