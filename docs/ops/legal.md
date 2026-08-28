# Ops — Legal (Legal-1)

**ADR:** ADR-032  
**Alcance:** Documentos públicos en `/legal/*`, avisos en LP y billing.  
**Estado vigente:** **DRAFT** — publicado en producción como borrador orientativo; **no sustituye** revisión ni aprobación de abogado en Perú.

## Pendiente — handoff abogado

**Uso actual:** las páginas en `/legal/*` están live en `geoagro.ai` como **draft interno/publicable** (piloto, waitlist, sandbox billing). Válidas para operar sin cobro live; **no** como paquete legal final.

**Pendiente explícito (Julio → counsel Perú):**

- [ ] Enviar paquete legal a abogado para **revisión y aprobación** antes de cobro live
- [ ] Completar identidad del operador: razón social, RUC, domicilio fiscal (`src/content/legal/types.ts` → `LEGAL_OPERATOR_*`)
- [ ] Incorporar observaciones del abogado en `documents.ts` + actualizar `LEGAL_LAST_UPDATED`
- [ ] Confirmar en session-log cuando counsel apruebe el texto (desbloquea checklist billing §2)

**Qué enviar al abogado:**

| Entregable | Ubicación |
|------------|-----------|
| Texto legal (4 docs) | `src/content/legal/documents.ts` o URLs live `/legal/*` |
| Runbook ops | Este archivo (`docs/ops/legal.md`) |
| Checklist cobro | `docs/ops/billing.md` → sección checklist legal |
| Contexto producto | LP `geoagro.ai`, billing sandbox en stg, planes USD en suscripción §1 |
| Foco sugerido | Ley 29733, IGV/facturación electrónica, transferencias internacionales (Clerk/Vercel/Neon/Stripe), B2B, reembolsos, EUDR disclaimer |

**Hasta aprobación:** mantener banner orientativo en `LegalDocumentView`; no habilitar cobro live en apex.

## Documentos publicados

| Ruta | Contenido |
|------|-----------|
| `/legal/terms` | Términos de servicio |
| `/legal/privacy` | Política de privacidad (Ley 29733 referenciada) |
| `/legal/refunds` | Política de reembolsos |
| `/legal/subscription` | Términos de suscripción (planes, USD, Clerk/Stripe) |

Fuente en código: `src/content/legal/documents.ts`  
Última actualización: constante `LEGAL_LAST_UPDATED` en `src/content/legal/types.ts`.

## Avisos en producto

- **LP** (`/`): sección Precios con enlaces a `LEGAL_NAV_LINKS`; footer legal compartido
- **Auth** (sign-in/sign-up) y **billing/cancel**: footer `LegalFooterLinks`

## Checklist antes de cobro live (geoagro.ai)

Marcar en `docs/ops/billing.md` cuando aplique:

1. **Publicación** — documentos en `/legal/*` ✅ (Legal-1) — **estado DRAFT** hasta aprobación abogado
2. **Revisión y aprobación abogado** — pendiente; handoff en sección «Pendiente — handoff abogado» arriba
3. **LP** — avisos no vinculantes + enlaces legal ✅
4. **Stripe Production** + Clerk Billing live en instancia Production
5. **Webhook Production** + secret en Vercel
6. **Smoke cobro** controlado + cancelación documentada
7. **Confirmación explícita** en session-log

Hasta completar 2–7: **ningún cobro live** en apex.

## Cambiar contenido legal

1. Editar `src/content/legal/documents.ts` (modelo `blocks` por sección)
2. Actualizar `LEGAL_LAST_UPDATED` y, cuando aplique, `LEGAL_OPERATOR_*` en `types.ts`
3. Commit slice Legal-1.x si es cambio sustantivo
4. Tras cambios materiales de precios/cobro, re-validar con asesor legal

## Legal-1.1 (2026-08-28)

- Modelo `blocks` para orden párrafos/listas
- Tabla planes alineada con `billing.md` (USD + miembros + slugs Clerk)
- Glosario LP (Básico/Profesional/Empresa) ↔ slugs
- Disclaimer EUDR, piloto/beta, API/CSV en términos
- Waitlist: consentimiento → `/legal/privacy`
- Placeholders operador (razón social / RUC) pendientes de abogado
- SEO: canonical/OG por doc, sitemap, `dynamicParams = false`

## Legal-1.2 (2026-08-28)

- `LEGAL_NAV_LINKS` compartido; `LegalFooterLinks` en LP, auth, billing-cancel
- Twitter metadata por doc; tests nav ↔ slugs
- Operador en refunds/subscription; B2B, IGV/USD, transferencias 29733
- Email vía constante en derechos/reembolsos

## LP-claims (2026-08-28)

- Claims suavizados: API/CSV roadmap, EUDR apoyo documental, sin SLA/firma digital
- Matriz planes alineada con entitlements; disclaimer en card Trazabilidad
- Waitlist: términos + privacidad; JSON-LD USD
