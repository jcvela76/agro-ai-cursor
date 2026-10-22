# Campaña LinkedIn — testers Free (2 semanas)

| Campo | Valor |
|-------|--------|
| **Inicio** | 2026-10-22 |
| **Cierre / review** | ~2026-11-05 (junto con SEO + Analytics) |
| **Objetivo** | 1–3 testers Free (agrónomos / ops / dueños de finca en Perú) |
| **Canal** | LinkedIn orgánico (sin ads) |
| **Producto** | Weather Free · `https://geoagro.ai` |

## URLs con UTM

| Destino | URL |
|---------|-----|
| Landing | `https://geoagro.ai/?utm_source=linkedin&utm_medium=organic&utm_campaign=free_testers_202610` |
| Sign-up | `https://geoagro.ai/sign-up?utm_source=linkedin&utm_medium=organic&utm_campaign=free_testers_202610` |

## Calendario

| Día | Acción |
|-----|--------|
| **D0 (hoy)** | Publicar **Post 1** · 5–10 DMs a contactos cercanos |
| **D+2** | **Post 2** · +5 DMs |
| **D+5** | **Post 3** (o solo DMs si ya hay respuestas) |
| **D+7** | Revisar Analytics (pageviews `/`, `/sign-up`, utm_campaign) + leads |
| **D+10** | Segunda ola DMs (10–15) si faltan testers |
| **~D+14 (5-nov)** | Review conjunto: Analytics + GSC Performance + nº testers activos |

## Qué no afirmar

- Cobro Stripe live / precios mid como oferta pública vinculante
- Índices Sentinel / NDRE / zonas en el plan Free
- SENAMHI live
- ML, alertas SMS, certificación EUDR automática

## Post 1 — Problema → Free (publicar primero)

**Pack listo (imagen + copy + tags + DM):** [`linkedin-post1-ready.md`](linkedin-post1-ready.md) · assets en [`assets/`](assets/).

Clima de estación o promedio regional no es el clima de *tu* parcela.

En Agro AI el plan Free te da clima georreferenciado por parcela, con fuente y frescura explícitas (Open-Meteo y NASA POWER). Sin cobro en esta fase.

Si operas en Perú y quieres probarlo:  
→ https://geoagro.ai/sign-up?utm_source=linkedin&utm_medium=organic&utm_campaign=free_testers_202610

Buscamos 1–3 testers para feedback real. Comenta o mándame DM.

## Post 2 — Producto concreto

¿Qué ves en Free?

- Parcela en mapa
- Clima con fuente y frescura
- Open-Meteo y NASA POWER

Enterprise (índices / operación) va aparte; Free es para empezar sin fricción.

Registro:  
https://geoagro.ai/sign-up?utm_source=linkedin&utm_medium=organic&utm_campaign=free_testers_202610

## Post 3 — Llamado a testers

Estoy abriendo Agro AI Free a un puñado de productores y agrónomos en Perú.

Si te interesa clima por parcela (no promedios genéricos) y puedes dar feedback en 1–2 semanas, escríbeme.

Landing: https://geoagro.ai/?utm_source=linkedin&utm_medium=organic&utm_campaign=free_testers_202610

## Plantilla DM

Hola [nombre] — estoy lanzando Agro AI Free: clima por parcela en Perú (fuente y frescura explícitas). Busco 1–3 testers para feedback corto. ¿Te interesa probar? Registro: https://geoagro.ai/sign-up?utm_source=linkedin&utm_medium=organic&utm_campaign=free_testers_202610 — si prefieres, te cuento en 2 mensajes qué incluye Free vs Enterprise.

## Checklist operativo

1. Publicar Post 1 desde perfil (o página empresa).
2. 10–20 DMs totales en la quincena (Ica, Piura, Lima, valle).
3. Responder en menos de 24 h hábiles.
4. Anotar leads (DM / waitlist Neon / sheet).
5. Tras signup: confirmar clima en `/app` (no forzar Plus).
6. ~5-nov: review Analytics + GSC + testers (SEO deferred).

## Dónde medir

| Señal | Dónde |
|-------|--------|
| Visitas LP / signup | Vercel → Analytics · filtro `utm_campaign=free_testers_202610` |
| Búsqueda orgánica | GSC → Performance (impresiones/clics) |
| Testers | Signups Free + feedback cualitativo |
