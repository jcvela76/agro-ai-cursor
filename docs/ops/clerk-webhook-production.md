# Ops — Clerk webhook Production (`geoagro.ai`)

**Slice:** Billing-ops-prod  
**Scope:** endpoint + env para Billing-3 en Production. **No** habilita cobro live ni Stripe.

## Por qué

Billing-3 sincroniza `maxAllowedMemberships` y revoca invitaciones sobre tope vía webhook:

- `organization.created`
- `organizationInvitation.created`

En stg esto corre con `scripts/clerk-webhook-stg.sh`. Production necesita el mismo endpoint en la instancia **Production** de Clerk.

## Prerrequisitos

| Item | Valor |
|------|--------|
| Instancia | agro-ai-auth → **Production** |
| URL endpoint | `https://geoagro.ai/api/webhooks/clerk` |
| Secret API | `sk_live_…` (solo para script / Backend API; no commitear) |
| Vercel Production | `CLERK_WEBHOOK_SIGNING_SECRET=whsec_…` (del endpoint Svix) |
| Vercel Production | `NEXT_PUBLIC_APP_URL=https://geoagro.ai` |

Preview/stg sigue con su propio `whsec_…` en **Preview** — no reutilizar el secret de Production.

## Pasos

### 1. Vercel env (Production)

En proyecto `agro-ai-cursor` → Settings → Environment Variables:

| Variable | Production | Preview |
|----------|------------|---------|
| `NEXT_PUBLIC_APP_URL` | `https://geoagro.ai` | `https://stg.geoagro.ai` |
| `CLERK_WEBHOOK_SIGNING_SECRET` | `whsec_…` (Production endpoint) | `whsec_…` (stg endpoint) |

Redeploy Production tras cambiar secrets.

### 2. Crear / actualizar endpoint en Clerk Production

```bash
# Export sk_live_… (temporal; no guardar en repo)
export CLERK_SECRET_KEY=sk_live_…
chmod +x scripts/clerk-webhook-prod.sh
./scripts/clerk-webhook-prod.sh
```

En Svix / Dashboard:

1. Add endpoint → `https://geoagro.ai/api/webhooks/clerk`
2. Suscribir todos los eventos listados por el script (ver `scripts/clerk-webhook-events.sh`)
3. Copiar **Signing secret** → Vercel Production `CLERK_WEBHOOK_SIGNING_SECRET`

Helper stg (Development): `./scripts/clerk-webhook-stg.sh`

### 3. Smoke Production (org admin)

1. Sign-in en `https://geoagro.ai` como admin de org de prueba (p. ej. Lima Coffee prod).
2. `/app/admin` → Miembros: anotar límite del plan (p. ej. 2 en free).
3. Invitar un correo cuando estés en el tope (activos + pendientes = límite).
4. **Esperado:** invitación revocada o bloqueada por Billing-3 (si webhook OK).
5. Clerk Dashboard → Webhooks → endpoint → ver entregas 200.

Opcional (cuando Billing Production esté habilitado): `subscriptionItem.*` actualiza entitlements.

## Qué NO hace este slice

- Habilitar Clerk Billing en Production (PricingTable vacía hasta entonces)
- Conectar Stripe account propia
- Cobro live en Perú (checklist legal en `docs/ops/billing.md`)

## Archivos

- `scripts/clerk-webhook-prod.sh`
- `scripts/clerk-webhook-stg.sh`
- `scripts/clerk-webhook-events.sh` (lista compartida)
- Handler: `src/app/api/webhooks/clerk/route.ts`

## Troubleshooting

| Síntoma | Causa probable |
|---------|----------------|
| Webhook 400 Verification failed | `CLERK_WEBHOOK_SIGNING_SECRET` incorrecto o mezclado stg/prod |
| Invitaciones no revocadas | Falta `organizationInvitation.created` en endpoint Production |
| `maxAllowedMemberships` desactualizado | Falta `organization.created` o no pasó por `/app/admin` backfill |
| Redirect invitación a vercel.app | `NEXT_PUBLIC_APP_URL` ausente en Production |
