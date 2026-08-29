# Pre-client QA — gate antes de usuarios reales

**Objetivo:** un pase global (automatizado + manual) antes del piloto con clientes.  
**No incluye:** cobro Stripe live (diferido post-MVP).  
**Entornos:** local + `stg.geoagro.ai` (Neon compartido). Apex `geoagro.ai` solo smoke público legal/LP.

## Organizaciones (por qué existen)

En Agro AI, **Clerk Organization = workspace = tenant**:

| Qué aísla la org | Ejemplo |
|------------------|---------|
| Parcelas, informes, review, trace | Datos de “Finca A” no se mezclan con “Finca B” |
| Entitlements / plan | Plus en una org, Weather base en otra |
| Miembros e invitaciones | Agrónomo de un cliente ≠ equipo de otro |
| Billing (cuando viva) | Suscripción por workspace, no por usuario |

**¿Un usuario puede tener varias orgs?** Sí (Clerk). Casos reales: consultor que asesora dos fundos; holding con filiales; vos como ops en Lima Coffee + sandbox.

**¿Hace falta en el MVP piloto?** Casi nunca. Un cliente = **una org**. El switcher existe porque el modelo multi-tenant ya está; no implica que debas crear varias orgs por persona. Si confunde en el piloto, usá una sola org demo y no invites al switcher.

---

## Comando one-shot (capa automatizada)

```bash
# Offline + stubs (mínimo obligatorio)
npm run qa:pre-client

# + Neon + contraste live Ica (recomendado antes de clientes)
SMOKE_NEON=1 SMOKE_WEATHER_LIVE=1 SMOKE_SENTINEL_LIVE=1 npm run qa:pre-client
```

Equivale a, en orden:

1. `npm test`
2. `npm run lint`
3. `SMOKE_SENAMHI=1 SMOKE_SENTINEL_STUB=1 npm run smoke:all`
4. `npm run smoke:report-contrast` (y live/Neon si env)
5. `npm run smoke:spectral-perf` si `SMOKE_NEON=1` o `SMOKE_SENTINEL_LIVE=1`
6. Imprime checklist manual (abajo)

Opcional aparte: `npm run audit:env` · `npm run build`

---

## Checklist manual (stg / browser)

Cuenta: miembro de **Lima Coffee** (o org piloto) con `weather` + `weather_plus` (+ trace/review si aplica).

| # | Flujo | OK |
|---|--------|-----|
| M1 | Sign-in → `/app` carga mapa + parcela | ☐ |
| M2 | **Clima:** obs + forecast + lluvia/ET0 visibles con fuente | ☐ |
| M3 | Crear/editar parcela (geometría) sin perder tab activo | ☐ |
| M4 | **Espectral:** índices, overlay, zonas, historial; cache badge si aplica | ☐ |
| M5 | Generar **informe hídrico** + preview `/reports/…` | ☐ |
| M6 | **Briefing diario** (cupo / ya generado hoy) | ☐ |
| M7 | **Agente:** pregunta con parcela; cita evidencia; cross-org refuse | ☐ |
| M8 | **Perfil** agronómico guardar/leer | ☐ |
| M9 | **Trace:** lote + evento + EUDR gate (si entitlement) | ☐ |
| M10 | **Review:** append decide + list | ☐ |
| M11 | **Admin:** settings + members (sin romper límites) | ☐ |
| M12 | Público apex: `/legal/terms` muestra RAW CODE S.A.C. / sin DRAFT | ☐ |
| M13 | Org switcher: con **una** org no hace falta usarlo; verificar que no hay fuga cross-org | ☐ |

---

## Criterio de salida (go / no-go piloto)

| Capa | Go |
|------|-----|
| `qa:pre-client` automatizado | PASS (warns cross-provider OK) |
| Checklist M1–M12 | Sin blockers P0 |
| Datos | Neon migrado; parcela demo Ica o cliente con geometría |
| Billing live | **No requerido** |
| CDSE en Production | Opcional; stg live basta para piloto stg |

**Veredicto:** anotar en `~/Projects/context/agro-ai/session-log.md` con fecha + PASS/FAIL + issues.

---

## Fallos típicos

| Síntoma | Dónde mirar |
|---------|-------------|
| Spectral 503 / empty | `SENTINEL_CLIENT_*` en Vercel Preview; ToS CDSE |
| Weather skip en contraste | `SMOKE_WEATHER_LIVE=1` + `free` stack |
| Org vacía / sin parcelas | entitlements Clerk + `db:seed` |
| Informe viejo sin cache Neon | regenerar informe (HTML inmutable) |
