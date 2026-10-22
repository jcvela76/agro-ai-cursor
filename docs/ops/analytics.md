# Ops — Analytics (visitas y CWV)

## Stack

| Pieza | Uso | Dónde mirar |
|-------|-----|-------------|
| **Vercel Web Analytics** | Pageviews / rutas (`/`, `/sign-up`, etc.) | Proyecto `agro-ai-cursor` → **Analytics** |
| **Vercel Speed Insights** | Core Web Vitals reales (LCP, INP, CLS) | Proyecto → **Speed Insights** |
| **Google Search Console** | Impresiones, clics, indexación SEO | [sc-domain:geoagro.ai](https://search.google.com/search-console?resource_id=sc-domain%3Ageoagro.ai) |

Código: `@vercel/analytics` + `@vercel/speed-insights` en `src/app/layout.tsx`.

## Activar en el dashboard (una vez)

1. Vercel → `agro-ai-cursor` → **Analytics** → Enable (Hobby/Pro según plan).
2. Misma pantalla o menú → **Speed Insights** → Enable.
3. Tras el próximo deploy Production, generar tráfico (abrir `geoagro.ai`) y esperar minutos a que aparezcan eventos.

Sin Enable en el dashboard, el componente en código no muestra datos.

## Qué mirar (LinkedIn / Free testers)

| Pregunta | Fuente |
|----------|--------|
| ¿Llegó gente a la LP? | Analytics → pageviews `/` |
| ¿Clic a signup? | Analytics → `/sign-up` (y UTMs si usas query; Analytics muestra path) |
| ¿Google ya muestra la página? | GSC → Performance (clics/impresiones; hay lag de días) |
| ¿La página es lenta en móvil? | Speed Insights + GSC Core Web Vitals |

UTMs del kit LinkedIn (`utm_campaign=free_testers_202610`) sirven para correlacionar campañas; el path principal sigue siendo `/` y `/sign-up`.

## Privacidad

Web Analytics de Vercel es cookieless / privacy-friendly (sin GA4 por defecto). Si más adelante se añade GA4, actualizar `/legal/privacy`.
