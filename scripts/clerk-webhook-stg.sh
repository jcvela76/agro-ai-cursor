#!/usr/bin/env bash
# Create/update Clerk webhook for stg using Backend API (sk_test only — no CLI Platform scopes).
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

EVENTS='[
  "subscriptionItem.active",
  "subscriptionItem.updated",
  "subscriptionItem.ended",
  "subscriptionItem.canceled",
  "subscriptionItem.expired",
  "subscriptionItem.abandoned",
  "organization.created",
  "organizationInvitation.created"
]'

echo "→ Listing existing webhooks…"
EXISTING=$(curl -sS -H "Authorization: Bearer $CLERK_SECRET_KEY" \
  "https://api.clerk.com/v1/webhooks?limit=100")

echo "$EXISTING" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for w in data.get('data', []):
    print(f\"  {w.get('id')}: {w.get('url')}\")
" 2>/dev/null || echo "$EXISTING"

MATCH_ID=$(echo "$EXISTING" | python3 -c "
import json, sys, os
url = os.environ.get('WEBHOOK_URL', '')
data = json.load(sys.stdin)
for w in data.get('data', []):
    if w.get('url') == url:
        print(w.get('id', ''))
        break
" WEBHOOK_URL="$WEBHOOK_URL" 2>/dev/null || true)

BODY=$(python3 -c "
import json, os
print(json.dumps({
  'url': os.environ['WEBHOOK_URL'],
  'enabled': True,
  'subscribe': json.loads(os.environ['EVENTS']),
}))
" WEBHOOK_URL="$WEBHOOK_URL" EVENTS="$EVENTS")

if [[ -n "$MATCH_ID" ]]; then
  echo "→ Updating webhook $MATCH_ID → $WEBHOOK_URL"
  RESP=$(curl -sS -X PATCH "https://api.clerk.com/v1/webhooks/$MATCH_ID" \
    -H "Authorization: Bearer $CLERK_SECRET_KEY" \
    -H "Content-Type: application/json" \
    -d "$BODY")
else
  echo "→ Creating webhook → $WEBHOOK_URL"
  RESP=$(curl -sS -X POST "https://api.clerk.com/v1/webhooks" \
    -H "Authorization: Bearer $CLERK_SECRET_KEY" \
    -H "Content-Type: application/json" \
    -d "$BODY")
fi

echo "$RESP" | python3 -c "
import json, sys
d = json.load(sys.stdin)
if 'errors' in d:
    print(json.dumps(d, indent=2))
    sys.exit(1)
secret = d.get('signing_secret') or d.get('secret')
print('Webhook id:', d.get('id'))
if secret:
    print('Signing secret:', secret)
    print('')
    print('Add to Vercel Preview:')
    print('  vercel env add CLERK_WEBHOOK_SIGNING_SECRET preview')
    print('  (paste the whsec_ value)')
else:
    print(json.dumps(d, indent=2)[:2000])
"
