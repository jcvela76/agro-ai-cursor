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

- **LP** (`/`): sección Precios con enlaces a legal; footer con Términos / Privacidad / Suscripción.
- **Billing** (`/app/billing`): banner sandbox enlaza a suscripción y reembolsos; footer legal existente.

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
