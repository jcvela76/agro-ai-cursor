# Ops — Legal (Legal-1)

**ADR:** ADR-032  
**Alcance:** Documentos públicos en `/legal/*`, avisos en LP y billing.  
**Estado vigente:** **APROBADO** por counsel Perú (2026-08-29) — operador `RAW CODE S.A.C.` RUC `20614132206`. Cobro live en apex sigue sujeto al checklist de `docs/ops/billing.md` (§ Stripe Production / webhook / smoke).

## Handoff abogado — cerrado

- [x] Paquete legal enviado / revisado por abogado (Perú)
- [x] Identidad del operador completada (`LEGAL_OPERATOR_*` desde ficha RUC SUNAT)
- [x] Texto vigente en `documents.ts` + `LEGAL_LAST_UPDATED=2026-08-29`
- [x] Confirmación en session-log (desbloquea checklist billing § aprobación counsel)

**Qué se envió / revisó:**

| Entregable | Ubicación |
|------------|-----------|
| Texto legal (4 docs) | `src/content/legal/documents.ts` · URLs `/legal/*` |
| Runbook ops | Este archivo |
| Checklist cobro | `docs/ops/billing.md` |
| Operador | Ficha RUC RAW CODE S.A.C. `20614132206` |

Banner DRAFT retirado de `LegalDocumentView` tras aprobación.

## Documentos publicados

| Ruta | Contenido |
|------|-----------|
| `/legal/terms` | Términos de servicio |
| `/legal/privacy` | Política de privacidad (Ley 29733 referenciada) |
| `/legal/refunds` | Política de reembolsos |
| `/legal/subscription` | Términos de suscripción (planes, USD, Clerk/Stripe) |

Fuente en código: `src/content/legal/documents.ts`  
Última actualización: constante `LEGAL_LAST_UPDATED` en `src/content/legal/types.ts`.

### Operador

| Campo | Valor |
|-------|--------|
| Producto | Agro AI |
| Razón social | RAW CODE S.A.C. |
| RUC | 20614132206 |
| Domicilio fiscal | Cal. Las Gaviotas 117, Dpto. 201, Urb. Limatambo, Surquillo, Lima, Perú |
| Contacto | `hola@geoagro.ai` |

## Avisos en producto

- **LP** (`/`): sección Precios con enlaces a `LEGAL_NAV_LINKS`; footer legal compartido
- **Auth** (sign-in/sign-up) y **billing/cancel**: footer `LegalFooterLinks`

## Checklist antes de cobro live (geoagro.ai)

Marcar en `docs/ops/billing.md` cuando aplique:

1. **Publicación** — documentos en `/legal/*` ✅ (Legal-1)
2. **Revisión y aprobación abogado** ✅ 2026-08-29
3. **LP** — avisos + enlaces legal ✅
4. **Stripe Production** + Clerk Billing live en instancia Production
5. **Webhook Production** + secret en Vercel
6. **Smoke cobro** controlado + cancelación documentada
7. **Confirmación explícita** en session-log (cobro live)

Hasta completar 4–7: **ningún cobro live** en apex.

## Cambiar contenido legal

1. Editar `src/content/legal/documents.ts` (modelo `blocks` por sección)
2. Actualizar `LEGAL_LAST_UPDATED` y, cuando aplique, `LEGAL_OPERATOR_*` en `types.ts`
3. Commit slice Legal-1.x si es cambio sustantivo
4. Tras cambios materiales de precios/cobro, re-validar con asesor legal

## Legal-1.3 (2026-08-29)

- Counsel aprobación confirmada
- Operador RUC/razón social/domicilio desde ficha SUNAT
- Banner DRAFT retirado

## Legal-1.2 (2026-08-28)

- `LEGAL_NAV_LINKS` compartido; `LegalFooterLinks` en LP, auth, billing-cancel
- Twitter metadata por doc; tests nav ↔ slugs
- Operador en refunds/subscription; B2B, IGV/USD, transferencias 29733
- Email vía constante en derechos/reembolsos

## Legal-1.1 (2026-08-28)

- Modelo `blocks` para orden párrafos/listas
- Tabla planes alineada con `billing.md` (USD + miembros + slugs Clerk)
- Glosario LP (Básico/Profesional/Empresa) ↔ slugs
- Disclaimer EUDR, piloto/beta, API/CSV en términos
- Waitlist: consentimiento → `/legal/privacy`
- Placeholders operador (razón social / RUC) — reemplazados en Legal-1.3
- SEO: canonical/OG por doc, sitemap, `dynamicParams = false`

## LP-claims (2026-08-28)

- Claims suavizados: API/CSV roadmap, EUDR apoyo documental, sin SLA/firma digital
- Matriz planes alineada con entitlements; disclaimer en card Trazabilidad
- Waitlist: términos + privacidad; JSON-LD USD
