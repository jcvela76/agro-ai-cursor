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
7. Recreado **Lima Coffee (sintetica)** con entitlements `weather`, `weather_plus`, `traceability`, `agronomic_review` + `authorizedParcelIds: []`.
8. Usuario operador `me@juliovela.com` creado en Production (admin de Lima Coffee). Sin password aún → usar **Forgot password** en `/sign-in` la primera vez.

Smoke infra: apex HTML incluye `pk_live` + `clerk.geoagro.ai`; `/sign-in` `x-clerk-auth-status: signed-out` OK.

## Smoke pendiente (operador)

1. https://geoagro.ai/sign-in → Forgot password → `me@juliovela.com`
2. Entrar → activar org Lima Coffee → `/app`
3. Parcela Norte → Clima / Trace / Review

## No hacer

- Poner `pk_live_` en `.env.local` sin subdomain HTTPS (Clerk lo bloquea en localhost).
- Borrar DNS TXT/CNAME de Clerk o el TXT de Search Console.
- Billing / SENAMHI en este slice (gate legal).

## Staging

`stg.geoagro.ai` (rama `stg`) sigue en keys **Development** (`pk_test_`) vía Preview. Ver [staging-domain.md](staging-domain.md).

## Nota OAuth

Production no usa shared Google OAuth de Development. Hoy sign-in = **email + password**. Si se quiere Google en live, configurar OAuth credentials propias en Clerk Dashboard → User & authentication.
