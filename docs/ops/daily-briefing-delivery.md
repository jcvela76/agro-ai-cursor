# Daily briefing delivery (Report-2b)

Cron Vercel genera briefings diarios pendientes y envía email con link preview + PDF.

## Preferencias (Admin)

`/app/admin` → **Briefing diario por email**

- Toggle “Enviar cada mañana”
- Destinatarios (coma-separados)
- Parcelas: todas o subconjunto
- Hora fija piloto: **06:00 America/Lima** (`0 11 * * *` UTC en `vercel.json`)
- WhatsApp: reservado, no activable aún

API admin: `GET|PUT /api/reports/daily-briefing-delivery`

## Cron

- Ruta: `GET|POST /api/cron/daily-briefings`
- Auth: `Authorization: Bearer $CRON_SECRET`
- Por cada org con prefs `enabled`:
  1. Exige entitlement `weather_plus`
  2. Por parcela: reutiliza briefing ready de hoy o genera uno (consume cupo diario)
  3. Envía email (Resend si hay key; stub en local/test)

## Env vars

| Variable | Uso |
|----------|-----|
| `CRON_SECRET` | Obligatorio en Vercel para el cron |
| `RESEND_API_KEY` | Envío real; sin ella → stub (log en memoria) |
| `REPORT_EMAIL_FROM` | From Resend (default `Agro AI <noreply@geoagro.ai>`) |
| `APP_BASE_URL` | Links absolutos en el email (stg/prod). Fallback: `VERCEL_URL` |

## Migración

`0006_daily_briefing_delivery` — tabla `daily_briefing_delivery_prefs`.

```bash
npm run db:migrate
```

## Probar local

```bash
CRON_SECRET=dev-cron curl -H "Authorization: Bearer dev-cron" \
  http://localhost:3000/api/cron/daily-briefings
```
