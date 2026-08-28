# Spectral — discovery (proveedor satélite live)

Estado: **live CDSE en código** (`SPECTRAL_SOURCE=sentinel_hub` + OAuth). Stub/offline siguen disponibles.

## Objetivo

Sustituir fixtures offline por reflectancia Sentinel-2 L2A real por parcela (polígono), con evidencia explícita (misión, nivel, fecha adquisición, frescura) y el mismo gate **Weather Intelligence Plus** que Spectral-1.

## Proveedor v1 (ADR-038)

| Proveedor | Rol |
|-----------|-----|
| **CDSE Sentinel Hub Statistical API** | Live: media de bandas B02/B03/B04/B05/B08/B11/B12 sobre AOI |
| Sentinel Hub stub | Offline Plus con provenance stub |
| Offline fixtures | Dev/tests sin red |

Endpoints:

- Token: `https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token`
- Stats: `https://sh.dataspace.copernicus.eu/api/v1/statistics`

Env: `SENTINEL_CLIENT_ID`, `SENTINEL_CLIENT_SECRET` (OAuth client credentials). Opcional: `SPECTRAL_LOOKBACK_DAYS` (default 30), `SPECTRAL_FRESHNESS_DAYS` (default 14), `SPECTRAL_MAX_CLOUD_COVERAGE` (default 80), `SPECTRAL_CACHE_TTL_MS` (default 3600000 = 1h, cache in-memory de índices CDSE).

## Contrato de adapter (`SpectralSource`)

Ya definido en `src/domain/spectral/types.ts`:

- Entrada: `parcelId` + hint `latitude`/`longitude` + `geometry` (live AOI) + `timezone`.
- Salida: `ParcelVegetationIndices` con `SpectralReflectanceBands` → índices calculados en dominio.
- Errores cerrados: `unavailable`, `stale`, `unsupported_range`, `internal_error`.

## Política de escena

1. **AOI:** polígono de parcela (fallback buffer ~110 m si solo hay punto).
2. **Ventana de búsqueda:** últimos N días (`SPECTRAL_LOOKBACK_DAYS`, default 30 — niebla costera Lima).
3. **Frescura badge:** ≤ `SPECTRAL_FRESHNESS_DAYS` (default 14) → `fresh`; si no → `stale` (datos se devuelven).
4. **Nubes catálogo:** `maxCloudCoverage` default 80.
5. **Evidencia:** `sourceId=sentinel-hub-cdse`, misión Sentinel-2, L2A.
6. **Autorización:** `authorizeWeatherPlusAccess` + parcela antes del proveedor.
7. **Secretos:** solo env / Vercel; nunca fixtures ni git.

## Gates transversales

| Gate | Cuándo |
|------|--------|
| Legal / privacy | **stg OK** (cuenta CDSE general); Production → revalidar ToS/uso comercial |
| Billing Plus | Ya activo (`weather_plus`) |
| `SPECTRAL_SOURCE=sentinel_hub` | Requiere `SENTINEL_CLIENT_*` |

## Slice Spectral-3 (stub)

- `SentinelHubStubSpectralSource` + `SPECTRAL_SOURCE=sentinel_hub_stub`.

## Slice Spectral-4 (live)

- `SentinelHubSpectralSource` + factory `sentinel_hub`.
- Cache in-memory TTL (default 1h) + cache de overlay en cliente al cambiar índice/opacidad.
- Smoke: `SMOKE_SENTINEL_LIVE=1 npm run smoke:spectral`.

## Diferido

- Series temporales / compositing multi-fecha.
- Persistencia Neon de escenas e índices históricos.
- Máscara SCL agresiva (puede vaciar AOIs bare-soil).

## Slice Spectral-5 (raster overlay)

- Process API PNG por índice + capa MapLibre `image`/`raster`.
- Fallback a grilla sintética si Process falla.
- Smoke live valida `rendering=sentinel_raster`.

## Slice Spectral-6 (análisis por zonas)

- Fishnet 3×3 (celdas con centro dentro del polígono, máx. 9).
- Live: Statistical API por celda con la misma ventana de escena que el raster (`acquiredAt` + 6d).
- Offline/fallback: valores sintéticos alrededor de la media parcelaria.
- Tiers **relativos** bajo/medio/alto (terciles intra-parcela, no umbrales agronómicos absolutos).
- API `GET /api/parcels/[id]/spectral/zones?index=`; panel + contornos MapLibre; tool agente `getParcelSpectralZones`.
- ADR-040.
