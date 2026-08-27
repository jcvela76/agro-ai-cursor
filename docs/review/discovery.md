# Agronomic Review — discovery

Estado: **Fase 7a (Review-1)** — decisiones humanas append-only, registry offline.

## Objetivo

Producto separado: registrar observación / recomendación / decisión de un actor autorizado, vinculadas a parcela, sin edición ni borrado. Sin tools en Agro Agent (WQ-16/17).

## Preguntas (piloto v1)

| # | Pregunta | Estado v1 (ADR-025) |
|---|----------|---------------------|
| 1 | Tipos de decisión | Cerrado: `observe` \| `recommend` \| `decide` |
| 2 | Quién firma | `actorId` del usuario autenticado; multi-aprobación diferida |
| 3 | Evidencia | `evidenceRef` opcional (string); sin uploads |
| 4 | Scope | Org + parcel obligatorio en append; list filtrable por `parcelId` |
| 5 | Persistencia | Offline in-process (Review-1); Neon → Review-2 |

## Contratos

`src/domain/review/types.ts`:

- `ReviewDecision` / `AppendReviewDecisionInput` / `ReviewDecisionRegistry`
- Gate: `authorizeAgronomicReviewAccess` → `REVIEW_UNAVAILABLE`
- Entitlement: `agronomic_review`

Runtime: `OfflineReviewDecisionRegistry` + fixtures coffee/Lima. APIs `GET|POST /api/review/decisions`. UI tab **Revisión**.

## Límites

- No recomendaciones operativas automáticas (regar/fumigar) desde el agente.
- Append-only: sin PATCH/DELETE en Review-1.
- Sin geometría en respuestas Review.

## Próximo paso

Review-2 Neon persistence, o ops (Billing / SENAMHI) tras gate legal.
