# Spectral — discovery (proveedor satélite live)

Estado: **stub en código** (`SPECTRAL_SOURCE=sentinel_hub_stub`). Live diferido hasta contrato/legal.

## Objetivo

Sustituir fixtures offline por reflectancia Sentinel-2 L2A real por parcela (polígono), con evidencia explícita (misión, nivel, fecha adquisición, frescura) y el mismo gate **Weather Intelligence Plus** que Spectral-1.

## Candidatos (evaluación preliminar)

| Proveedor | Pros | Contras / riesgo |
|-----------|------|------------------|
| **Sentinel Hub** | API Process/Statistical, AOI polígono, índices derivados, documentación madura | Coste por request; contrato comercial; keys en Vercel |
| **Copernicus Data Space (CDSE)** | Datos oficiales ESA; OAuth; sin vendor lock-in de índice | Integración más verbosa; cuotas; latencia |
| **Microsoft Planetary Computer** | STAC + xarray; bueno para prototipos | Menos control SLA Perú; dependencia Azure |
| **Google Earth Engine** | Potente para series | Términos/ToS restrictivos para SaaS multi-tenant; no MVP |

**Recomendación para slice live:** priorizar **Sentinel Hub** o **CDSE** según pricing y legal; no mezclar dos proveedores en v1.

## Contrato de adapter (`SpectralSource`)

Ya definido en `src/domain/spectral/types.ts`:

- Entrada: `parcelId` + hint `latitude`/`longitude` (centroide para lookup offline; polígono completo en live).
- Salida: `ParcelVegetationIndices` con `SpectralReflectanceBands` → índices calculados en dominio.
- Errores cerrados: `unavailable`, `stale`, `unsupported_range`, `internal_error`.

Live adapter adicional (Spectral-2+):

- Overlay real: muestreo de grilla dentro del polígono o tile render — hoy overlay es **sintético** derivado del índice puntual.

## Requisitos live (checklist)

1. **AOI:** geometría `Polygon` de parcela (ya en Neon).
2. **Escena:** última L2A &lt;14 días, cobertura nubosa &lt;80% (política producto Make).
3. **Bandas:** B02, B03, B04, B05, B08, B11, B12 (reflectancia 0–1).
4. **Evidencia:** `sourceId`, `sourceLabel`, `acquiredAt`, `satelliteMission`, `processingLevel`, `freshnessPolicy`.
5. **Autorización:** evaluar antes de llamar proveedor (`authorizeWeatherPlusAccess` + parcela).
6. **Secretos:** API key / OAuth solo en env Vercel; nunca en fixtures ni tests.

## Gates transversales

| Gate | Cuándo |
|------|--------|
| Legal / privacy | Antes de procesar imágenes satelitales de clientes en producción |
| Billing Plus | Ya activo (`weather_plus`) |
| `SPECTRAL_SOURCE=sentinel_hub` (live) | Rechazado en factory hasta ADR + ops checklist |

## Slice Spectral-3 (hecho en código)

- `SentinelHubStubSpectralSource`: fixtures offline con provenance Sentinel Hub stub.
- `SPECTRAL_SOURCE=sentinel_hub_stub` en factory; `sentinel_hub` lanza error.
- Tests stub + factory.

## Diferido

- Series temporales / compositing multi-fecha.
- Overlay mapa desde tiles reales (no grilla sintética).
- Persistencia Neon de escenas e índices históricos.
