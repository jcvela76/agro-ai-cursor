# Ops — SEO (LP marketing)

## Política

| Ambiente | Indexación | Host |
|----------|------------|------|
| Production (`VERCEL_ENV=production`, `main`) | `index,follow` | apex `geoagro.ai` (post-promote) |
| Preview / staging (`stg`, local) | `noindex,nofollow` + `robots Disallow: /` | `stg.geoagro.ai`, `*.vercel.app` previews |

Canonical y `metadataBase` siempre apuntan a **`https://geoagro.ai`** para no diluir señales entre hosts.

## Archivos

| Pieza | Path |
|-------|------|
| Site constants | `src/lib/site.ts` |
| Metadata root | `src/app/layout.tsx` |
| robots | `src/app/robots.ts` |
| sitemap | `src/app/sitemap.ts` |
| OG / Twitter image | `src/app/opengraph-image.jpg`, `twitter-image.jpg` |
| Icons | `src/app/icon.tsx`, `apple-icon.tsx` |

Rutas SEO públicas en Clerk middleware: `/robots.txt`, `/sitemap.xml`, icon/OG routes.

## Post-promote

1. ~~Adjuntar apex `geoagro.ai` a Production.~~ Hecho (2026-08-27).
2. Verificar Search Console / Bing (`metadata.verification` cuando haya tokens).
3. Slice SEO-2: JSON-LD, `next/image` LCP, cache HTML de `/`.
4. Opcional: `www` → `geoagro.ai` redirect 308 si aún no está.
