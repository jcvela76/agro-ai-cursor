# Ops — Legal (Legal-1)

**ADR:** ADR-032  
**Alcance:** Documentos públicos en `/legal/*`, avisos en LP y billing.  
**No sustituye:** revisión por abogado antes de **cobro live** en Perú.

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

1. **Publicación** — documentos en `/legal/*` ✅ (Legal-1)
2. **Revisión abogado** — Julio / asesor externo (pendiente)
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
