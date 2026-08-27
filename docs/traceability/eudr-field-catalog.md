# Catálogo EUDR — piloto coffee v1 (Trace-4)

Estado: **cerrado para piloto sintético** (ADR-024). No es certificación legal ni due diligence completa.

## Objetivo

Congelar los campos mínimos que el runtime Traceability exige para declarar un lote coffee **listo para exportar** en el piloto interno. La geometría de parcela permanece en Parcel Core; Trace solo guarda el vínculo.

## Campos del lote (obligatorios para export)

| Campo | Tipo | Obligatorio | Notas piloto |
|-------|------|-------------|--------------|
| `countryOfProduction` | ISO 3166-1 alpha-2 | Sí (create) | Default `PE` (mercado inicial) |
| `producerName` | string | Sí (create) | Operador / productor sintético |
| `productionEndDate` | fecha `YYYY-MM-DD` | Sí antes de `exported` | Fin de producción del lote |
| `deforestationFreeDeclared` | boolean | Sí `true` antes de `exported` | Declaración sintética; sin verificación remota |
| `parcelLinks[]` | `parcelId` | ≥1 antes de `exported` | Geolocalización vía Parcel Core (sin geometría en Trace) |

## Campos ya cerrados (Trace-1..3)

| Campo | Entidad | Notas |
|-------|---------|-------|
| `cropType` | lote | Default `coffee` |
| `harvestSeason` | lote | Temporada de cosecha |
| `eventType` | evento | `planted` \| `harvested` \| `processed` \| `exported` |
| `occurredAt` / `actorId` | evento | Append-only |
| `evidenceRef` | evento | Opcional; sin uploads |

## Fuera de alcance (piloto)

- Uploads de evidencia / DDS real
- Validación satelital de deforestación
- Aprobación multi-actor
- Duplicar coordenadas en respuestas Trace
- Agent tools (WQ-17)

## Gate runtime

`AppendOrgTraceEvent` con `eventType=exported` exige el catálogo completo (`evaluateEudrExportReadiness`). Create puede dejar `productionEndDate` vacío y `deforestationFreeDeclared=false` (borrador).
