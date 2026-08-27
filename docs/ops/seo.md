# Ops — SEO (LP marketing)

## Política

| Ambiente | Indexación | Host |
|----------|------------|------|
| Production (`VERCEL_ENV=production`, `main`) | `index,follow` | `https://geoagro.ai` |
| Preview / staging (`stg`, local) | `noindex,nofollow` + `robots Disallow: /` | `stg.geoagro.ai`, `*.vercel.app` previews |

Canonical y `metadataBase` siempre apuntan a **`https://geoagro.ai`** para no diluir señales entre hosts. `www.geoagro.ai` → apex `308`.

## Archivos

| Pieza | Path |
|-------|------|
| Site constants | `src/lib/site.ts` |
| Metadata root | `src/app/layout.tsx` |
| JSON-LD | `src/app/landing-json-ld.tsx` |
| robots | `src/app/robots.ts` |
| sitemap | `src/app/sitemap.ts` |
| OG / Twitter image | `src/app/opengraph-image.jpg`, `twitter-image.jpg` |
| Icons | `src/app/icon.tsx`, `apple-icon.tsx` |
| LP images | `public/landing/*` vía `next/image` (AVIF/WebP) |
| Cache headers | `next.config.ts` (`/` s-maxage=3600; `/landing/*` immutable) |

Rutas SEO públicas en Clerk middleware: `/robots.txt`, `/sitemap.xml`, icon/OG routes. Signed-in en `/` → redirect `/app` en middleware (la LP no llama `auth()`, ISR `revalidate=3600`).

## Checklist anti-penalty

- Un solo canonical (`geoagro.ai`); stg noindex
- Sin thin/cloaking: mismo copy indexable que ve el usuario
- JSON-LD alineado al contenido visible (Organization / WebSite / WebPage / SoftwareApplication)
- LCP: hero `priority` + formatos modernos; sin bloquear crawl
- No indexar `/app`, `/api`, auth (`robots.txt`)

## Pendiente ops

1. ~~Search Console / Bing verification~~ — Domain `sc-domain:geoagro.ai` verificado (DNS TXT en Vercel); sitemap `https://geoagro.ai/sitemap.xml` submitted (Success).
2. Monitor Core Web Vitals en GSC tras indexación
3. Bing Webmaster (opcional)

## Search Console

| Item | Valor |
|------|-------|
| Cuenta | `me@juliovela.com` |
| Property | `sc-domain:geoagro.ai` |
| Método | DNS TXT (`google-site-verification=…` en Vercel DNS) |
| Sitemap | `https://geoagro.ai/sitemap.xml` |
| Consola | https://search.google.com/search-console?resource_id=sc-domain%3Ageoagro.ai |
