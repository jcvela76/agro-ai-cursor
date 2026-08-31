# Programa piloto — ops (tracking, formularios, logs)

**Estado:** Pilot-ops-1 · 2026-08-31  
**App:** `/app/piloto` · APIs `/api/pilot/*`  
**Guía participante:** [`docs/pilot/participant-guide.md`](../pilot/participant-guide.md)  
**Auditoría Dedicado:** [`docs/ops/dedicated-plan-audit.md`](dedicated-plan-audit.md)

---

## 1. Objetivos

1. Onboardar participantes con guía + checklist  
2. Capturar **feedback** estructurado (inicio, semanal, fallo)  
3. Registrar **eventos de uso** (qué probaron)  
4. Guardar **fallos** en Neon para análisis semanal  

Sentry u otro APM puede añadirse después; esta capa es **piloto-first** en nuestra DB.

---

## 2. Formularios (UI `/app/piloto`)

| Formulario | Cuándo | Campos clave |
|------------|--------|--------------|
| **Inicio** | Día 1 | Rol, región, cultivo, ha aprox., expectativa |
| **Feedback semanal** | Fin de sem. 1 y 2 | Qué usó, qué faltó, utilidad (1–5), comentario |
| **Reportar fallo** | Al fallar | Flujo (clima/espectral/agente/…), mensaje, repro steps |

Todos requieren sesión Clerk + org. Se guardan en `pilot_feedback`.

---

## 3. Taxonomía de eventos (`pilot_events`)

| `eventName` | Cuándo |
|-------------|--------|
| `pilot.hub_open` | Abre `/app/piloto` |
| `pilot.checklist_toggle` | Marca ítem checklist |
| `pilot.feedback_submit` | Envía formulario |
| `weather.panel_open` | Tab clima (si instrumentado) |
| `spectral.panel_open` | Tab espectral |
| `agent.chat_send` | Envía mensaje agente |
| `agent.chat_fail` | Error stream/API agente |
| `spectral.overlay_fail` | Fallo overlay / PNG |
| `report.generate_fail` | Fallo informe |

Payload JSON acotado (≤ 4 KB): `{ parcelId?, tab?, code?, ms? }` — sin PII de terceros.

---

## 4. Errores (`pilot_error_logs`)

Campos: `source`, `message`, `stack` (truncado), `route`, `userAgent`, `orgId`, `userId`, `severity`, `createdAt`.

Severities: `info` | `warn` | `error`.

Cliente: `reportPilotError()` → `POST /api/pilot/errors`.  
Servidor: `recordPilotError()` desde catch de rutas críticas (agente, espectral).

---

## 5. Análisis semanal (ops)

```sql
-- Feedback últimos 7 días
SELECT kind, rating, left(body, 120), created_at
FROM pilot_feedback
ORDER BY created_at DESC LIMIT 50;

-- Eventos por nombre
SELECT event_name, count(*) FROM pilot_events
WHERE created_at > now() - interval '7 days'
GROUP BY 1 ORDER BY 2 DESC;

-- Fallos
SELECT source, message, count(*) FROM pilot_error_logs
WHERE created_at > now() - interval '7 days'
GROUP BY 1, 2 ORDER BY 3 DESC;
```

Anotar hallazgos en `~/Projects/context/agro-ai/session-log.md`.

---

## 6. Privacidad

- Solo orgs piloto / miembros invitados  
- No loguear contenido completo del chat del agente (solo códigos de error)  
- Retención sugerida: 180 días luego purge (job futuro)  

---

## 7. Pendiente

- [ ] Instrumentar más tabs del shell (weather/spectral open)  
- [ ] Vista admin de feedback (hoy: SQL)  
- [ ] Sentry (errores prod) enlazado a release  
- [ ] Export CSV semanal automatizado  
