# Traceability — discovery

Estado: **discovery en paralelo** (sin runtime en fase 1).

## Objetivo fase 2

MVP interno coffee/EUDR con datos sintéticos. Integración con Agro Agent solo cuando el producto Traceability esté activo en el workspace (WQ-17 REFUSE hasta entonces).

## Preguntas abiertas

1. ¿Qué eventos mínimos conforman un lote trazable (siembra, cosecha, procesamiento, export)?
2. ¿Quién firma/aprueba cada transición en workflow humano?
3. ¿Qué evidencia documental adjunta cada evento?
4. ¿Cómo se vincula parcela ↔ lote sin exponer geometría excesiva en Weather?
5. ¿Qué campos EUDR son obligatorios vs opcionales en piloto Perú?

## Contratos de dominio (TypeScript)

Interfaces en `src/domain/traceability/types.ts`:

- `TraceLot` — identidad del lote
- `TraceEvent` — evento append-only
- `ParcelLink` — vínculo parcela-lote

## Límites vs Weather

- Agro Agent **no** expone tools de trazabilidad en v1.
- Pronósticos weather **no** inferen lotes afectados (WQ-17 REFUSE).

## Próximo paso

Entrevistas de workflow + fixtures sintéticos coffee antes de closed beta.
