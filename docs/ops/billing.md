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

**Modelo producto:** el tier **free no requiere suscripción** — org en `free_org` (Clerk) con `weather` vía metadata default / mapper `free`. Los planes de pago en `<PricingTable />` llevan **free trial** (sandbox: p. ej. 14 días) antes del cobro.

**Moneda:** precios en **USD** (internacional). Clerk Billing Development gateway cobra en USD; montos en Dashboard: $29 / $79 / $99 mensuales.

| Plan slug       | Precio (USD/mes) | Features incluidas                                      | Uso |
|-----------------|------------------|---------------------------------------------------------|-----|
| `free` / `free_org` | — (sin suscripción) | `weather`                                          | Base |
| `weather_plus`  | $29              | `weather`, `weather_plus`                               | Plus (+ trial) |
| `operations`    | $79              | las cuatro                                              | Trace + Review (+ trial) |
| `full`          | $99              | las cuatro                                              | Alias comercial (+ trial) |

No crear `weather_base` en Dashboard: Clerk exige mín. $1 en planes custom; el tier weather-only queda cubierto por `free_org`.

### Límites de miembros (piloto — flat org, sin per-seat)

Tope de **miembros activos + invitaciones pendientes** por plan (UI en `/app/admin` → Miembros; solo `org:admin` invita):

| Plan slug | Asientos máx. |
|-----------|---------------|
| `free` / `free_org` | 2 |
| `weather_plus` | 5 |
| `operations` | 15 |
| `full` | 25 |

**Enforcement (Billing-3):**

1. **Clerk `maxAllowedMemberships`** — sincronizado al cambiar plan (webhook billing) y al abrir `/app/admin` (backfill). Clerk bloquea membresías por encima del tope nativo.
2. **Webhook `organizationInvitation.created`** — si activos + pendientes superan el tope del plan, revoca la invitación recién creada (cubre invitaciones pendientes y bypass vía Dashboard).
3. Eventos extra en webhook stg: `organization.created`, `organizationInvitation.created` (ver `scripts/clerk-webhook-stg.sh`).

Mapper: `src/domain/billing/plan-limits.ts`. Sin cobro per-seat en Clerk por ahora; al llegar al tope, CTA a `/app/billing`.

### Cuota de informes (Plus — ADR-035 / ADR-036)

**Puntuales** (`PLAN_REPORT_LIMITS`) — Clima / Agente / Trace on-demand:

| Plan slug | Informes / mes |
|-----------|----------------|
| `free` / `free_org` | 0 (upsell) |
| `weather_plus` | 10 |
| `operations` | 30 |
| `full` | 50 |

**Briefings diarios** (`PLAN_DAILY_BRIEFING_LIMITS`, ADR-036 — pendiente código Report-2a):

| Plan slug | Briefings / mes |
|-----------|-----------------|
| `free` / `free_org` | 0 |
| `weather_plus` | 20 |
| `operations` | 60 |
| `full` | 120 |

Además: máx. **1 briefing ready / día Lima / (org + parcela)**. Fallos no consumen cupo.

Acciones en tabs Clima / Agente / Trace; persistencia `generated_reports` en Neon.

Si Clerk emite `org:weather_plus`, el mapper normaliza quitando el prefijo `org:`.

Fallback si el payload no trae features: `PLAN_SLUG_ENTITLEMENTS` en `src/domain/billing/plan-entitlements.ts`.

## Setup Development (stg / Preview / local)

### 0. Si Billing → Settings da 404

**Normal antes de habilitar Billing.** Las rutas `~/billing/*` y `last-active?path=billing/*` no existen hasta que Billing está ON en la instancia **Development** de `agro-ai-auth`.

**Opción recomendada (CLI, sin Dashboard):**

```bash
cd ~/Projects/agro-ai
chmod +x scripts/clerk-billing-bootstrap.sh
./scripts/clerk-billing-bootstrap.sh
```

O paso a paso (sin `clerk link`; usa `--app`):

```bash
npx clerk@latest auth login          # cuenta con acceso a agro-ai-auth (me@juliovela.com)
npx clerk@latest apps list           # debe listar agro-ai-auth
npx clerk@latest enable billing --for orgs --app app_3IThUPXYe9TeXFToApdAlaB3OC2 --instance dev --yes
npx clerk@latest config patch --app app_3IThUPXYe9TeXFToApdAlaB3OC2 --instance dev \
  --file docs/ops/clerk-billing-plans.json --dry-run
npx clerk@latest config patch --app app_3IThUPXYe9TeXFToApdAlaB3OC2 --instance dev \
  --file docs/ops/clerk-billing-plans.json --yes
```

Si `clerk link` o `apps list` da **403 Missing authorization scopes**: cerrá sesión CLI y entrá con la cuenta del workspace **Raw Code's projects** (no solo jcvela@gmail.com si esa cuenta no es admin del app):

```bash
npx clerk auth logout
npx clerk auth login -y
```

Tras `enable billing`, el menú **Billing** aparece en el Dashboard (app → **Development**).

### 1. Habilitar Billing (Dashboard, alternativa)

Dashboard → app **agro-ai-auth** → selector **Development** → menú lateral **Billing** → **Settings**:

- Enable Billing for **Organizations**.
- Payment gateway: **Clerk development gateway** (Stripe test compartido; no cuenta Stripe propia).

### 2. Planes y Features

Dashboard → **Billing** → **Plans** → **Plans for Organizations** (o usar `docs/ops/clerk-billing-plans.json` vía CLI arriba):

1. Crear Features con los slugs de la tabla (o adjuntarlas a cada plan en la UI).
2. Crear planes de pago `weather_plus`, `operations`, `full` (mín. **$1**/mes en UI; free = `free_org` sin suscripción).
3. Marcar planes **Publicly available** si deben verse en `<PricingTable />`.

### 3. Webhook

Dashboard → **Configure** → **Webhooks** → Add endpoint:

- URL stg: `https://stg.geoagro.ai/api/webhooks/clerk`
- URL local (tunnel): `https://<ngrok>/api/webhooks/clerk`

Eventos mínimos:

- `subscriptionItem.active`
- `subscriptionItem.updated`
- `subscriptionItem.ended`
- `subscriptionItem.canceled`
- `subscriptionItem.expired`
- `subscriptionItem.abandoned`
- `organization.created` (Billing-3: sync `maxAllowedMemberships`)
- `organizationInvitation.created` (Billing-3: revoca invitación sobre tope)

Helper: `./scripts/clerk-webhook-stg.sh` (checklist + link Svix; no CRUD API).

Production: `./scripts/clerk-webhook-prod.sh` — ver `docs/ops/clerk-webhook-production.md`.

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

## Production (`geoagro.ai`)

| Paso | Estado |
|------|--------|
| Código webhook + mapper + `/app/billing` | ✅ en `main` |
| Webhook Production `https://geoagro.ai/api/webhooks/clerk` | ✅ Ops 2026-08-28 — `docs/ops/clerk-webhook-production.md` |
| `CLERK_WEBHOOK_SIGNING_SECRET` Vercel Production | ✅ 2026-08-28 |
| Smoke member limits Production (Lima Coffee) | ✅ 2026-08-28 |
| `NEXT_PUBLIC_APP_URL` en Vercel Production | **Verificar** `https://geoagro.ai` |
| Billing enabled + Stripe **account propia** en instancia Production | Pendiente (counsel OK 2026-08-29; falta Stripe Production) |
| Montos vinculantes / cobro live en Perú | Pendiente checklist Stripe / smoke cobro |

El webhook Production puede configurarse **antes** de cobro live (org member limits + futuros `subscriptionItem.*`).

### Checklist legal (antes de cobro live)

- [x] Términos / política de privacidad / facturación publicados en `/legal/*` (Legal-1, 2026-08-28)
- [x] Precios LP con aviso legal explícito + enlaces a `/legal/subscription`, `/legal/terms`, `/legal/privacy`
- [x] Revisión y **aprobación** por abogado (Perú) — 2026-08-29; operador RAW CODE S.A.C. RUC 20614132206; ver `docs/ops/legal.md`
- [ ] Stripe account Production conectada en Clerk Production (no reusar gateway dev)
- [x] Webhook Production + `CLERK_WEBHOOK_SIGNING_SECRET` en Vercel Production (Billing-ops-prod, 2026-08-28; smoke member limits OK)
- [ ] Smoke cobro real con monto mínimo controlado y reverso/cancelación documentados
- [ ] Confirmación explícita de Julio en session-log / ops (cobro live)

Hasta completar Stripe + smoke: **ningún cobro live** en apex.

Ver también: `docs/ops/legal.md`.

## Override ops

`/app/admin` sigue permitiendo editar entitlements a mano. El PATCH conserva `billingPlanSlug`. Tras confiar en webhooks, el override queda solo para incidentes.

## SENAMHI

- **Stub (hecho):** `WEATHER_SOURCE=senamhi_stub` → `SenamhiStubWeatherSource` (fixtures offline, provenance SENAMHI stub). Requiere entitlement `weather_plus` (ADR-006 / ADR-031).
- **Live:** `WEATHER_SOURCE=senamhi` rechazado en factory hasta contrato/legal.

## Archivos ancla

- Ops manual (Dashboard): `docs/ops/clerk-billing-manual.md`
- Planes JSON (CLI): `docs/ops/clerk-billing-plans.json`
- Scripts: `scripts/clerk-billing-bootstrap.sh`, `scripts/clerk-webhook-stg.sh`, `scripts/clerk-webhook-prod.sh`
- Mapper: `src/domain/billing/plan-entitlements.ts`
- Límites miembros: `src/domain/billing/plan-limits.ts`
- Parse webhook: `src/application/billing/parse-subscription-item-event.ts`
- Sync: `src/application/billing/sync-org-billing-entitlements.ts`
- Route: `src/app/api/webhooks/clerk/route.ts`
- UI: `src/ui/billing-panel.tsx`, `src/ui/billing-cancel-panel.tsx`, `src/ui/billing-workspace-nav.tsx`, `src/app/app/billing/page.tsx`, `src/app/app/billing/cancel/page.tsx`
