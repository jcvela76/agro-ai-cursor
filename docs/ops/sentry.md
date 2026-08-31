# Sentry — Agro AI

**Org Sentry:** [rw-code-sac](https://rw-code-sac.sentry.io) (US)  
**Proyecto:** [`agro-ai`](https://rw-code-sac.sentry.io/projects/agro-ai/) (creado 2026-08-31)  
**SDK:** `@sentry/nextjs` · configs en repo root + `src/instrumentation.ts`

## Env (Vercel Preview / Production / `.env.local`)

| Variable | Dónde | Notas |
|----------|--------|--------|
| `NEXT_PUBLIC_SENTRY_DSN` | Client + build | DSN público del proyecto |
| `SENTRY_DSN` | Server / edge | Puede ser el mismo DSN |
| `SENTRY_AUTH_TOKEN` | CI / Vercel (secret) | Upload source maps |
| `SENTRY_ORG` | CI | default `rw-code-sac` |
| `SENTRY_PROJECT` | CI | default `agro-ai` |
| `SENTRY_ENVIRONMENT` | opcional | override; si no, `VERCEL_ENV` |

Sin DSN, el SDK queda **disabled** (no rompe local).

## Setup checklist

1. ~~En Sentry → Create Project → Next.js → nombre `agro-ai`~~ ✅ 2026-08-31  
2. Copiar DSN → Vercel env (Production + Preview + Development) + `.env.local` ✅ 2026-08-31  
3. (Opcional) Auth token con scope `project:releases` / `org:read` para source maps  
4. Redeploy (necesita push o redeploy manual para stg/prod)  
5. Verificar: `GET /api/debug/sentry-test` (no Production) → issue en Sentry ✅ local 2026-08-31 (`AGRO-AI-1`)  

## Relación con telemetría piloto

| Capa | Uso |
|------|-----|
| Neon `pilot_*` | Feedback, eventos de producto, errores de negocio del piloto |
| Sentry | Excepciones no manejadas, stack traces, performance, alertas |

`reportPilotError` también intenta `Sentry.captureMessage` si el SDK está activo.

## Privacy

`sendDefaultPii: false`. No enviar contenido de chat del agente a Sentry.
