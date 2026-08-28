# Agronomic Review — discovery

Estado: **Fase 7b (Review-2)** — persistencia Neon `review_decisions`.

## Objetivo

Producto separado: registrar observación / recomendación / decisión de un actor autorizado, vinculadas a parcela, sin edición ni borrado. Sin tools en Agro Agent (WQ-16/17).

## Preguntas (piloto v1)

| # | Pregunta | Estado v1 (ADR-025..026) |
|---|----------|--------------------------|
| 1 | Tipos de decisión | Cerrado: `observe` \| `recommend` \| `decide` |
| 2 | Quién firma | `actorId` del usuario autenticado; multi-aprobación diferida |
| 3 | Evidencia | `evidenceRef` opcional (string); sin uploads |
| 4 | Scope | Org + parcel obligatorio en append; list filtrable por `parcelId` |
| 5 | Persistencia | **Cerrado** — Neon `review_decisions`; offline fallback sin `DATABASE_URL` |

## Contratos

`src/domain/review/types.ts`:

- `ReviewDecision` / `AppendReviewDecisionInput` / `ReviewDecisionRegistry`
- Gate: `authorizeAgronomicReviewAccess` → `REVIEW_UNAVAILABLE`
- Entitlement: `agronomic_review`

Runtime: `NeonReviewDecisionRegistry` (`DATABASE_URL`) o `OfflineReviewDecisionRegistry` (tests). APIs `GET|POST /api/review/decisions`. UI tab **Revisión**. Seed: `npm run db:seed:review`.

## Límites

- Orientación **basada en evidencia** en Agro Agent (WQ-18 GUIDED): sin órdenes operativas; ver `docs/agro-agent/evidence-based-recommendations.md`
- Append-only: sin PATCH/DELETE.
- Sin geometría en respuestas Review.

## Próximo paso

Smoke UI con entitlement en Lima Coffee; ops Billing/SENAMHI tras gate legal.
