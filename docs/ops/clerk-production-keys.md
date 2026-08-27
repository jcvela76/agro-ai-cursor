# Ops — Clerk production keys

Estado actual (2026-08-27): **dev instance en prod Vercel**.

- Local `.env.local`: `pk_test_` / `sk_test_`
- Frontend Clerk JS en local: `*.clerk.accounts.dev` (Development)
- Vercel Production tiene `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` (mismo patrón histórico de smoke: instancia **Development**)

## Por qué importa

Instancia Development ≠ Production. Usuarios/orgs/metadata de Lima Coffee viven en **dev**. Keys `pk_live_`/`sk_live_` apuntan a otra instancia vacía hasta migrar/recrear.

## Plan (slice Ops)

1. **Activar Production** en Clerk Dashboard (toggle Development → Create production instance) **o** `npx clerk@latest deploy` (wizard DNS/OAuth).
2. Dominio producción: `agro-ai-cursor.vercel.app` (y custom domain si existe). Completar DNS CNAME que indique Clerk.
3. Copiar **API Keys** Production (`pk_live_`, `sk_live_`).
4. En Vercel:
   - Dejar `pk_test_`/`sk_test_` solo en Preview + Development.
   - Añadir `pk_live_`/`sk_live_` **solo Production**.
5. Redeploy production.
6. Recrear en instancia Production:
   - Org Lima Coffee (o equivalente)
   - Entitlements en `public_metadata`: `weather`, `weather_plus`, `traceability`, `agronomic_review`
   - Membership del operador
7. Smoke: sign-in en prod → `/app` → parcela Norte → Clima / Trace / Review.

## No hacer

- Poner `pk_live_` en `.env.local` sin subdomain HTTPS (Clerk lo bloquea en localhost).
- Billing / SENAMHI en este slice (gate legal).

## Bloqueo / defer

**Diferido post-LP (2026-08-27):** no activar Production ni DNS Clerk hasta LP marketing / coming soon en el dominio Vercel. Seguir con Development (`pk_test_` / `sk_test_`) en local y Vercel.

Cuando retomar: pasos 1–7 arriba + recrear Lima Coffee en instancia live.
