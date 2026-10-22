# Ops — Waitlist LP

**Ruta:** `POST /api/waitlist` · formulario en `/`  
**Persistencia:** Neon tabla `waitlist_signups`  
**Aviso:** email a `WAITLIST_NOTIFY_TO` o, por defecto, `LEGAL_CONTACT_EMAIL` (`me@juliovela.com`).

## Env (Vercel Production / Preview)

| Variable | Uso |
|----------|-----|
| `DATABASE_URL` | Obligatorio para `persisted: true` |
| `RESEND_API_KEY` | ✅ seteado Prod/Preview 2026-10-22 (cuenta Resend juliovela) |
| `REPORT_EMAIL_FROM` | ✅ `Agro AI <onboarding@resend.dev>` hasta DNS `geoagro.ai` en Resend |
| `WAITLIST_NOTIFY_TO` | ✅ `me@juliovela.com` |

## Smoke

```bash
curl -sS -X POST https://geoagro.ai/api/waitlist \
  -H 'content-type: application/json' \
  -d '{"email":"you+waitlist@example.com","role":"productor","region":"Ica","crop":"uva"}'
# esperado: {"ok":true,"persisted":true,"notified":true|false}
```

`notified: false` con signup OK → falta `RESEND_API_KEY` o From no verificado en Resend.
