# Traceability — discovery

Estado: **Fase 6b (Trace-2) mutations** — crear lote + append event (memoria/fixtures).

## Objetivo fase 2

MVP interno coffee/EUDR con datos sintéticos. Integración con Agro Agent solo cuando el producto Traceability esté activo en el workspace (WQ-17 REFUSE hasta entonces).

## Preguntas (piloto v1)

| # | Pregunta | Estado v1 (ADR-021 / ADR-022) |
|---|----------|-------------------------------|
| 1 | Eventos mínimos | Cerrado: `planted` \| `harvested` \| `processed` \| `exported` |
| 2 | Quién firma/aprueba | Diferido; evento append-only con `actorId` |
| 3 | Evidencia documental | `evidenceRef` opcional (string); sin uploads |
| 4 | Parcela ↔ lote | `ParcelLink` por `parcelId`; sin geometría en respuestas Trace |
| 5 | Campos EUDR obligatorios | **Abierta** — diferido a Trace-3+ |

## Contratos de dominio

Interfaces en `src/domain/traceability/types.ts`:

- `TraceLot` — identidad del lote (+ `name`)
- `TraceEvent` — evento append-only (`TraceEventType` cerrado)
- `ParcelLink` — vínculo parcela-lote
- `TraceLotView` / `TraceLotRegistry` — listado + `createLot` / `appendEvent`

Runtime: `OfflineTraceLotRegistry` + `GET|POST /api/trace/lots` + `POST .../events` + tab Trazabilidad.

## Límites vs Weather

- Agro Agent **no** expone tools de trazabilidad (WQ-17).
- Pronósticos weather **no** inferen lotes afectados.

## Próximo paso

**Trace-3:** Neon persistence y/o catálogo de campos EUDR.
