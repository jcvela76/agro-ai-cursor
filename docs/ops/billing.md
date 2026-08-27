# Billing (Clerk Billing) — sandbox / ops

**ADR:** ADR-030  
**Alcance actual:** Billing-1 — sandbox/test en Development + `stg.geoagro.ai`.  
**No hacer:** cobro live a clientes en Perú / Stripe Production en `geoagro.ai` sin checklist legal abajo.

## Modelo

1. Cliente elige plan en `<PricingTable for="organization" />` (`/app/billing`).
2. Clerk Billing (gateway de desarrollo en instancia Development) gestiona la suscripción org-scoped.
3. Webhook `subscriptionItem.*` → `POST /api/webhooks/clerk` → mapper plan/features → `publicMetadata.entitlements` + `billingPlanSlug`.
4. Product gates siguen leyendo entitlements (ADR-013). Admin puede override manual hasta confiar en webhooks.

```text
LP (informativo) → /app/billing (admin) → Clerk Billing sandbox
  → webhooks → org publicMetadata → weather_plus / products
```

## Feature keys (Clerk Dashboard)

Crear **Features** con slugs idénticos a nuestros entitlements:

| Feature slug           | Entitlement app      |
|------------------------|----------------------|
| `weather`              | `weather`            |
| `weather_plus`         | `weather_plus`       |
| `traceability`         | `traceability`       |
| `agronomic_review`     | `agronomic_review`   |

## Planes para Organizations (slugs)

| Plan slug       | Features incluidas                                      | Uso |
|-----------------|---------------------------------------------------------|-----|
| `free`          | (default Clerk; mín. weather vía metadata ops)          | Base |
| `weather_base`  | `weather`                                               | Weather |
| `weather_plus`  | `weather`, `weather_plus`                               | Plus |
| `operations`    | las cuatro                                              | Trace + Review |
| `full`          | las cuatro                                              | Alias comercial |

Si Clerk emite `org:weather_plus`, el mapper normaliza quitando el prefijo `org:`.

Fallback si el payload no trae features: `PLAN_SLUG_ENTITLEMENTS` en `src/domain/billing/plan-entitlements.ts`.

## Setup Development (stg / Preview / local)

### 1. Habilitar Billing

Dashboard → instancia **Development** → [Billing Settings](https://dashboard.clerk.com/last-active?path=billing/settings):

- Enable Billing for **Organizations**.
- Payment gateway: **Clerk development gateway** (Stripe test compartido; no cuenta Stripe propia).

### 2. Planes y Features

Dashboard → [Subscription plans](https://dashboard.clerk.com/~/billing/plans) → **Plans for Organizations**:

1. Crear Features con los slugs de la tabla.
2. Crear planes `weather_base`, `weather_plus`, `operations`, `full` y adjuntar Features.
3. Marcar planes **Publicly available** si deben verse en `<PricingTable />`.

### 3. Webhook

Dashboard → Webhooks → endpoint:

- URL stg: `https://stg.geoagro.ai/api/webhooks/clerk`
- URL local (tunnel): `https://<ngrok>/api/webhooks/clerk`

Eventos mínimos:

- `subscriptionItem.active`
- `subscriptionItem.updated`
- `subscriptionItem.ended`
- `subscriptionItem.canceled`
- `subscriptionItem.expired`
- `subscriptionItem.abandoned`

Copiar **Signing Secret** (`whsec_…`) → env:

```bash
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...
```

Vercel: set en **Preview** (y Development local vía `.env.local`). No commitear el secret.

### 4. Smoke stg

1. Deploy `stg` con `CLERK_WEBHOOK_SIGNING_SECRET` + keys Development.
2. Sign-in como `org:admin` de Lima Coffee (dev org).
3. Abrir `/app/billing` → suscribir plan de prueba (`weather_plus`).
4. Verificar en Clerk org `publicMetadata`: `entitlements` y `billingPlanSlug`.
5. Admin → sección Suscripción muestra el plan; Plus/productos gated OK.

Tarjeta de prueba Stripe (development gateway): usar números de test de Stripe (p. ej. `4242…`).

## Production (`geoagro.ai`) — diferido

| Paso | Estado |
|------|--------|
| Código webhook + mapper + `/app/billing` | Puede estar en `main` (no cobra solo) |
| Billing enabled + Stripe **account propia** en instancia Production | Bloqueado hasta checklist legal |
| Montos vinculantes en LP | Bloqueado |
| Webhook prod `https://geoagro.ai/api/webhooks/clerk` | Solo tras gateway live + secret Production |
| Cobrar clientes en Perú | Bloqueado |

### Checklist legal (antes de cobro live)

- [ ] Términos / política de privacidad / facturación aplicables a Perú revisados
- [ ] Precios LP dejan de ser solo “informativos” con aviso legal explícito
- [ ] Stripe account Production conectada en Clerk Production (no reusar gateway dev)
- [ ] Webhook Production + `CLERK_WEBHOOK_SIGNING_SECRET` en Vercel Production
- [ ] Smoke cobro real con monto mínimo controlado y reverso/cancelación documentados
- [ ] Confirmación explícita de Julio en session-log / ops

Hasta entonces: **ningún cobro live** en apex.

## Override ops

`/app/admin` sigue permitiendo editar entitlements a mano. El PATCH conserva `billingPlanSlug`. Tras confiar en webhooks, el override queda solo para incidentes.

## SENAMHI (slice siguiente)

SENAMHI paid stub va **detrás** de entitlement / subscription (ADR-006). No forma parte de Billing-1.

## Archivos ancla

- Mapper: `src/domain/billing/plan-entitlements.ts`
- Parse webhook: `src/application/billing/parse-subscription-item-event.ts`
- Sync: `src/application/billing/sync-org-billing-entitlements.ts`
- Route: `src/app/api/webhooks/clerk/route.ts`
- UI: `src/ui/billing-panel.tsx`, `src/app/app/billing/page.tsx`
