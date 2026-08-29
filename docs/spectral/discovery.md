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

- Persistencia de extremos de zona por escena.
- Máscara SCL agresiva (puede vaciar AOIs bare-soil).
- Rasters históricos persistidos (Neon/Blob).

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

## Slice Spectral-7 (historial de escenas)

- Tabla Neon `spectral_scenes` (migración `0008`): upsert por org+parcela+fecha+fuente.
- Al consultar índices (Plus) se persiste la escena (medias de índices + evidencia).
- API `GET .../spectral/history?days=`; panel sparkline + lista; tool `getParcelSpectralHistory`.
- Offline: registry en memoria. Sin PNG histórico ni GIF (diferido).
- ADR-042.

## Slice Spectral-10 (timeline scrubber)

- Slider + play/pause sobre escenas de `GET .../spectral/history` (≥2); overlay PNG por frame vía cache `parcelId:indexId:day`.
- Zonas debounced (400 ms) y omitidas durante autoplay; prefetch overlay ±1.
- Botón «Mapa» y «Actual» (live) sincronizados con `timelineSceneId`.
- Sin GIF, dual-overlay ni persistencia de rasters.
- ADR-057.

## Slice Spectral-11 (badge sync + dual PNG + GIF)

- Badge «Escena» alineado con `timelineSceneId` (ADR-058).
- Comparar 2 fechas: mezcla A/B de PNG en mapa (ADR-059).
- Botón GIF en línea de tiempo: export cliente hasta 15 frames (`gifenc`).
- Sin persistencia Blob/Neon de rasters.

## Slice Spectral-8 (cron detección escena nueva)

- Cron Vercel cada 6h: `GET/POST /api/cron/spectral-scenes` (mismo auth `CRON_SECRET` que briefings).
- Solo orgs Plus con parcelas con geometría; descubrimiento: `SPECTRAL_CRON_ORG_IDS`, prefs briefing habilitadas, o orgs con parcelas en Neon.
- **No** persiste en cada tick si la escena es la misma (`acquiredAt` + `acquisitionDate` + `sourceId`); solo cuando CDSE devuelve captura nueva.
- `acquiredAt` = hora satelital de referencia (UI: “Captura (satélite)”), distinto de `updatedAt` de DB.
- Env opcional: `SPECTRAL_CRON_MAX_PARCELS` (default 25 por ejecución).
- ADR-043.

## Slice Spectral-9 (backfill histórico bajo demanda)

- `listVegetationIndexScenes` en adapter CDSE: 1 Statistical API call con intervalos `P1D` sobre ventana configurable.
- `POST .../spectral/backfill?days=30` (Plus, parcela con geometría); persiste medias en `spectral_scenes`.
- Panel Espectral: botón «Importar últimos 30 días» cuando hay pocas escenas guardadas.
- Sin PNG histórico (Spectral-hist-3). Sin auto-backfill al crear parcela.
- ADR-044.

### Smoke local (Ica)

```bash
npm run smoke:spectral-backfill-ica
SMOKE_SENTINEL_LIVE=1 npm run smoke:spectral-backfill-ica   # CDSE real
SMOKE_NEON=1 SMOKE_SENTINEL_LIVE=1 SMOKE_KEEP_PARCEL=1 npm run smoke:spectral-backfill-ica
```

Parcela ~5 ha en valle Tacama (Ica); crea → backfill 30d → verifica historial.

### Audit local / stg / prod

```bash
npm run audit:env
SMOKE_PARCEL_ID=parcel-xxx npm run audit:env
```

Compara git, Neon (`spectral_scenes` + parcela smoke), HTTP y presencia de env Vercel.

## Slice Spectral Perf-1/2 (latencia UI)

- Índices: `?source=cache` desde Neon → paint rápido; `?source=live` en background.
- Historial paralelo (no espera CDSE).
- Zonas: `acquiredAt` + `parcelMean` evitan segundo fetch de índices.
- Overlay: debounce 300 ms.
- ADR-045.

## Slice Spectral Perf-3 (persist zones Neon)

- Tabla `spectral_zone_snapshots` keyed por org+parcel+día+source+index.
- Read-through en `GET /zones`; write-through tras CDSE/synthetic.
- Query `?sourceId=` (desde evidence de índices) + `?refresh=1` fuerza miss.
- Badge `cache` en panel Zonas cuando `zones_cache_read`.
- ADR-046.

## Slice Spectral Perf-4 (1 Process → zone means)

- Cold path: 1× Process API TIFF FLOAT32 del índice + promedio por celda fishnet (`geotiff`).
- Fallback: loop Statistical por celda si Process falla.
- Evidence: `zones_fishnet_process_1` / methodId `zones/v2`; fallback `zones_fishnet_3` / `zones/v1`.
- ADR-047.

## Slice Spectral Perf-5 (precompute zones en cron)

- Tras `new_scene_only` persistido: precomputa zonas para los 8 índices del catálogo.
- Reusa `GetParcelSpectralZones` write-through → `spectral_zone_snapshots`.
- `zonesPrecomputed` en resultado del cron; best-effort por índice.
- ADR-048.

### Costos estimados (tiempo + CDSE)

| Paso | Esfuerzo eng. | Latencia percibida | Calls CDSE / open Espectral | $ (CDSE*) |
|------|---------------|--------------------|-----------------------------|-----------|
| **Antes** | — | 8–25 s bloqueado | ~12–20 | alto |
| **Perf-1** (hecho) | ~0.5 d | &lt;0.3 s con cache; live bg | 1 índices live (bg) | −~50% en revisita |
| **Perf-2** (hecho) | ~0.3 d | zonas sin +2–8 s de índices | zonas: 9→9 celdas, −1 índices | −1 Statistical / zonas |
| **Perf-3** (hecho) | ~1 d | zonas &lt;0.3 s en revisita | 0 si hit | −9 Statistical / revisita |
| **Perf-4** (hecho) | ~1 d | zonas 2–5 s cold | **1 Process** (fallback 9) | −8 Statistical / cold |
| **Perf-5** (hecho) | ~0.5 d | click ≈ Neon si cron ya corrió | 0 en click | +hasta 8 Process / escena nueva |

\*CDSE (Copernicus Data Space) en cuenta gratuita/research suele facturar en *processing units*, no USD fijo; el ahorro real es **cuota + latencia**. En comercial SH clásico, 1 Statistical ≈ fracción de céntimo — el costo dominante es tiempo de usuario y rate limits.
