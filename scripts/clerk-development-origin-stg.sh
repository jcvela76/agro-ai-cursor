#!/usr/bin/env bash
# Point Clerk Development instance session sync + invite landing at stg.geoagro.ai.
# Without this, accept-invite emails land on agro-ai-cursor.vercel.app/?__clerk_db_jwt=...
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

if [[ "${CLERK_SECRET_KEY}" != sk_test_* ]]; then
  echo "Refusing: expected Development key (sk_test_*), got something else."
  exit 1
fi

STG_ORIGIN="${STG_ORIGIN:-https://stg.geoagro.ai}"
CLERK_API_BASE="${CLERK_API_BASE:-https://api.clerk.com/v1}"

echo "→ Setting Clerk Development development_origin=${STG_ORIGIN}"
HTTP_CODE=$(curl -sS -o /dev/null -w "%{http_code}" -X PATCH \
  -H "Authorization: Bearer $CLERK_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d "$(python3 - <<PY
import json
print(json.dumps({
  "development_origin": "${STG_ORIGIN}",
  "allowed_origins": [
    "${STG_ORIGIN}",
    "https://agro-ai-cursor.vercel.app",
    "http://localhost:3000",
  ],
}))
PY
)" \
  "$CLERK_API_BASE/instance")

if [[ "$HTTP_CODE" != "204" && "$HTTP_CODE" != "200" ]]; then
  echo "PATCH /instance failed (HTTP $HTTP_CODE)"
  exit 1
fi

echo "✓ Clerk Development origin updated."
echo ""
echo "Next:"
echo "  1. Revoke pending invites created before this change."
echo "  2. Send a new invite from https://stg.geoagro.ai/app/admin"
echo "  3. Optional Vercel Preview env: NEXT_PUBLIC_APP_URL=${STG_ORIGIN}"
