# Ops — Clerk production keys

Estado (2026-08-27): **Production live en apex**.

| Ambiente | Instancia | Keys | FAPI |
|----------|-----------|------|------|
| Local `.env.local` | Development | `pk_test_` / `sk_test_` | `firm-feline-543.clerk.accounts.dev` |
| Vercel Preview / Development | Development | `pk_test_` / `sk_test_` | `*.clerk.accounts.dev` |
| Vercel Production (`geoagro.ai`) | Production | `pk_live_` / `sk_live_` | `clerk.geoagro.ai` / `accounts.geoagro.ai` |

App Clerk: **agro-ai-auth** (`app_3IThUPXYe9TeXFToApdAlaB3OC2`) — org Dashboard **Raw Code's projects** (GitHub). Managed via Vercel Marketplace.

## Hecho (cutover)

1. Production instance + dominio primario **`geoagro.ai`** (antes placeholder `*.lcl.dev`).
2. DNS Vercel (CNAME):
   - `clerk` → `frontend-api.clerk.services`
   - `accounts` → `accounts.clerk.services`
   - `clkmail` / `clk._domainkey` / `clk2._domainkey` → mail/DKIM Clerk
3. DNS Application + Email **Verified**; SSL emitido.
4. Vercel env:
   - Production: `pk_live_` / `sk_live_`
   - Preview + Development: `pk_test_` / `sk_test_`
5. Redeploy production (`dpl_B11nFZepJ6XXtL6EGmoUiubdjZTX` READY).
6. Organizations **enabled** en Production.
7. Recreado **Lima Coffee (sintetica)** (`org_3IW1Ls81Xul5wDXca1hCD0iAMQ5`) con entitlements `weather`, `weather_plus`, `traceability`, `agronomic_review`.
8. **Dual-seed Neon** (mismo DB): Development + Production en paralelo — ver tabla abajo.
9. Usuario operador `me@juliovela.com` admin; password recovery OK.

## Dual-seed (Neon compartido)

Clerk org IDs no migran entre instancias → dos copias de fixtures en el mismo Neon:

| Ambiente | Clerk org | Parcela Norte | Lots / review IDs |
|----------|-----------|---------------|-------------------|
| Development / stg / local / tests | `org_3ITi6wk2MTcwXZ1FrMaNZEKfR0G` | `parcel-lima-norte-001` (canónico) | sin sufijo |
| Production (`geoagro.ai`) | `org_3IW1Ls81Xul5wDXca1hCD0iAMQ5` | `parcel-lima-norte-prod-001` | sufijo `-prod` |

Tras editar fixtures: `npm run db:seed && npm run db:seed:trace && npm run db:seed:review`.

## Smoke prod (2026-08-27)

| Check | Resultado |
|-------|-----------|
| Sign-in live (`pk_live` / `clerk.geoagro.ai`) | OK |
| Org Lima Coffee activa | OK |
| `/api/parcels` → Norte (`…-prod-001`) | OK |
| Clima (NASA POWER, America/Lima) | OK |
| Trazabilidad lotes A/B + EUDR | OK |
| Revisión observe + recommend | OK |

## Smoke stg (2026-08-27, post dual-seed)

| Check | Resultado |
|-------|-----------|
| Sign-in Development (`pk_test_` / `accounts.dev`) | OK |
| Org Lima Coffee + Norte `parcel-lima-norte-001` | OK |
| Clima (NASA POWER) | OK |
| Trazabilidad lotes A/B | OK |
| Revisión observe + recommend (seed) | OK |

## No hacer

- Poner `pk_live_` en `.env.local` sin subdomain HTTPS (Clerk lo bloquea en localhost).
- Borrar DNS TXT/CNAME de Clerk o el TXT de Search Console.
- Billing / SENAMHI en este slice (gate legal).

## Staging

`stg.geoagro.ai` (rama `stg`) sigue en keys **Development** (`pk_test_`) vía Preview. Ver [staging-domain.md](staging-domain.md).

## Nota OAuth

Production no usa shared Google OAuth de Development. Hoy sign-in = **email + password**. Si se quiere Google en live, configurar OAuth credentials propias en Clerk Dashboard → User & authentication.
