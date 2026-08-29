# Feature inventory

Inventario vivo de features y sub-features de Agro AI.  
**Mantener al día:** cada slice que agregue, cambie o retire comportamiento debe actualizar este archivo (ver `.cursor/rules/feature-inventory.mdc`).

| Campo | Valor |
|-------|--------|
| **Última actualización** | 2026-08-29 (spectral date compare) |
| **Rama de referencia** | `stg` |
| **Estados** | `hecho` · `stub` · `parcial` · `docs` · `planificado` · `refuse` |

Entitlements en código: `weather` | `weather_plus` | `traceability` | `agronomic_review`.

---

## 1. Plataforma / Auth / Workspace

### Autenticación
| Feature | Estado | Detalle |
|---------|--------|---------|
| Sign-in / Sign-up (Clerk) | hecho | Login y registro |
| Orgs = workspaces | hecho | Organización Clerk = workspace |
| Organization switcher | hecho | Cambio de workspace en el shell |
| Middleware protect `/app` + `/api/*` | hecho | Públicas: `/`, `/legal/*`, waitlist, webhooks, SEO, accept-invitation |
| Google SSO | planificado | Diferido; Production email+password (ADR-029) |

### Autorización / entitlements
| Feature | Estado | Detalle |
|---------|--------|---------|
| Access resolver (Clerk metadata) | hecho | `entitlements`, parcelas autorizadas, plan |
| Entitlements de producto | hecho | weather, weather_plus, traceability, agronomic_review |
| Deny-before-provider | hecho | Deniega antes de llamar proveedores |
| Allowlist parcelas Weather | hecho | Vacío = todas del org |
| Synthetic access resolver | hecho | Acceso fake para tests/offline |

### Admin / miembros
| Feature | Estado | Detalle |
|---------|--------|---------|
| Panel admin (`/app/admin`) | hecho | Ajustes del workspace |
| Workspace settings API | hecho | `GET\|PATCH /api/workspace/settings` |
| Panel de miembros | hecho | Listado de miembros de la org |
| Invitaciones (crear / cancelar) | hecho | Límites por plan |
| Accept invitation page | hecho | `/accept-invitation` |
| Quitar miembros | hecho | `DELETE /api/org/members/[userId]` |
| Sync seats (`maxAllowedMemberships`) | hecho | Alineado con Billing |

---

## 2. Marketing / SEO / Waitlist

| Feature | Estado | Detalle |
|---------|--------|---------|
| Landing multi-sección | hecho | Hero, plataforma, productos, precios, waitlist |
| Precios informativos | hecho | No vinculantes (ADR-012) |
| Waitlist form + API | hecho | `POST /api/waitlist` → Neon |
| SEO (robots, sitemap, OG, JSON-LD, icons) | hecho | ADR-027/028 |
| Redirect autenticado `/` → `/app` | hecho | Middleware |
| LP “alertas por correo” (Básico) | docs | Overclaim; briefing email es Plus |
| LP “motor de alertas agronómicas” | docs | Roadmap; WQ-19 REFUSE alertas oficiales |
| LP “Export EUDR / API pública v1” | planificado | Roadmap landing `done: false` |

---

## 3. Parcel Core (plataforma; no vendible)

| Feature | Estado | Detalle |
|---------|--------|---------|
| Listar parcelas (org-scoped) | hecho | `GET /api/parcels` |
| CRUD parcelas | hecho | Create / patch / delete |
| Geometría Point | hecho | Centroide lat/lng para clima |
| Geometría Polygon / MultiPolygon | hecho | Contorno de parcela |
| MapLibre fullscreen shell | hecho | `/app` + OpenFreeMap |
| Terra Draw create/edit | hecho | Dibujar/editar polígonos |
| Markers / fill / fitBounds | hecho | Visualización y zoom |
| Área aproximada (ha) | hecho | Estimación de hectáreas |
| Límites por plan (# + máx ha) | hecho | free 2×25 · plus 10×100 · ops 40×500 · full 100×2000; grandfather shrink |
| Cupo en UI + CTA billing | hecho | Badge top chrome (plan · N/M · máx ha · selección/edición); Cancelar + Mejorar plan en nav al editar/dibujar; sin toast tapando el mapa |
| Registry Neon vs sintético | hecho | Persistencia real o fixtures |
| Seed parcelas | hecho | `npm run db:seed` |
| Historial de geometría | docs | En boundary; no en schema |
| Observaciones de campo (producto) | docs | En boundary; sin módulo |

---

## 4. Weather (producto base)

### Vistas y evidencia
| Feature | Estado | Detalle |
|---------|--------|---------|
| Vista observación + evidencia | hecho | T, precip, HR aire 2 m, viento 2 m; fuente/frescura |
| Vista pronóstico + evidencia | hecho | p.ej. 7d Open-Meteo |
| Estados cerrados | hecho | unavailable / stale / unsupported_range / internal_error |
| Panel Clima (UI) | hecho | Tab Clima; obs muestra HR + viento |
| HR / viento en observación | hecho | NASA POWER RH2M + WS2M; null-safe (ADR-052) |
| HR / viento en pronóstico | refuse | Fuera de slice; Open-Meteo forecast sin HR/WS |
| Dirección de viento | refuse | Diferido |

### Fuentes
| Feature | Estado | Detalle |
|---------|--------|---------|
| Offline weather | hecho | `WEATHER_SOURCE=offline` |
| Open-Meteo live | hecho | Free tier |
| NASA POWER live | hecho | Free tier |
| Composite free | hecho | `WEATHER_SOURCE=free` |
| SENAMHI stub | stub | `senamhi_stub`; Plus-gated (ADR-031) |
| SENAMHI live | planificado | Pendiente contrato/legal |
| Persistir series weather | refuse | Non-goal del charter |
| Alertas oficiales severas | refuse | WQ-19 |

### Corpus especificación
| Feature | Estado | Detalle |
|---------|--------|---------|
| WQ-01…10 BASE | hecho | Preguntas Weather base |
| WQ-11…15 PLUS | hecho | Vía tools del agente |
| WQ-16…20 REFUSE | hecho | Cross-workspace, inventar, alertas, etc. |
| WA-01…08 aceptación | hecho | Auth, frescura, Plus ausente, payload malo |

---

## 5. Weather Intelligence Plus

Gate: `weather` + `weather_plus`.

### Agro Agent
| Feature | Estado | Detalle |
|---------|--------|---------|
| Tab Agente (chat UI) | hecho | Shell; carga historial por parcela; badge retención |
| API chat streaming | hecho | `POST /api/agent/chat`; persiste turno user+assistant |
| Historial chat por parcela | hecho | Neon `agent_chat_messages`; hilo compartido org+parcela (ADR-049) |
| Retención chat por plan | hecho | Plus 7d / Ops 30d / Full 90d; tope 80 msgs; lazy prune |
| AI Gateway model path | hecho | ADR-015 |
| Tool observation / forecast | hecho | Obs: T/precip/HR/viento; forecast base |
| Tool lluvia 30d (WQ-11) | hecho | Agregado precipitación |
| Tool campaña vs año previo (WQ-12) | hecho | Comparación |
| Tool días baja lluvia (WQ-13) | hecho | Ranking en horizonte |
| Tool GDD (WQ-14) | hecho | Campaña siembra o YTD; base por cultivo/override |
| Tool ET0 Hargreaves (WQ-15) | hecho | Campaña + ETc orientativo Kc×ET0 si hay cultivo |
| Guidance evidence-based (WQ-18) | hecho | Orientación con límites; gaps de perfil en prompt |
| Contexto perfil en system prompt | hecho | Gaps prioritarios; updateParcelProfile sin confirmar |
| Catálogo cultivo PE + siembra ISO | hecho | cropKey; campaña desde siembra (ADR-050) |
| Tools Trace vía agente | refuse | WQ-17 |
| eve / agentes durables | planificado | ADR-014 diferido |
| OpenAI / Bedrock directo | docs | Re-eval ADR-015 |

### Informes (Reports)
| Feature | Estado | Detalle |
|---------|--------|---------|
| Generar informe | hecho | `POST /api/reports/generate` |
| PDF | hecho | Chromium o stub |
| Preview `/reports/[id]` | hecho | Vista de informe |
| Tipos clima / hídrico / agente / dossier | hecho | `domain/report/types` |
| Cuota mensual por plan | hecho | `PLAN_REPORT_LIMITS` |
| Briefing diario manual | hecho | Tipo `daily_briefing`; UI resetea cupo al cambiar parcela (no hereda “ya generado”) |
| Memoria de briefing | hecho | Parent + snapshot (ADR-036) |
| Email briefing + cron | hecho | `/api/cron/daily-briefings` |
| Prefs de entrega | hecho | Email (y canal WhatsApp stub) |
| WhatsApp delivery | stub | Prefs aceptan; envío rechazado |
| Tool briefings recientes | hecho | Agente lee historial |
| NDWI zonas en informe/briefing | hecho | Report-4 / ADR-041 |
| Contraste fidelidad (smoke) | hecho | `smoke:report-contrast` — report↔UC + cross-provider warn |
| Scorecard sugerencias (Review tags) | docs | Tag `report:… suggestion:… verdict:…`; `tally:report-suggestion-labels` |
| Tab Informes dedicado | refuse | ADR-035: acciones, no tab |

### Perfil agronómico (Report-3)
| Feature | Estado | Detalle |
|---------|--------|---------|
| Tab Perfil + CRUD | hecho | Por parcela; select cultivo PE + date siembra |
| API profile | hecho | `/api/parcels/[id]/profile` |
| Tools agente get/update | hecho | Lee/escribe; cropKey + gddBase |
| Neon `parcel_agronomic_profiles` | hecho | crop_key, gdd_base_celsius |
| Briefing usa perfil | hecho | Señales cultivo/siembra/gaps; umbrales piloto + costa árida |

### Bitácora de campo
| Feature | Estado | Detalle |
|---------|--------|---------|
| Tab Campo + lista/form | hecho | Texto + fecha + zona opcional; append-only |
| API field-notes | hecho | `GET\|POST /api/parcels/[id]/field-notes` |
| Neon `parcel_field_notes` | hecho | Índice org+parcel+observed_at |
| Gate Plus | hecho | Igual que Perfil / Agente |
| Tools agente list/append | hecho | `getParcelFieldNotes` / `appendParcelFieldNote` |
| Fotos / pin mapa | planificado | Slice 2 |
| Editar/borrar notas | refuse | Append-only (ADR-051) |

---

## 6. Spectral (capacidad Plus; no entitlement aparte)

### Índices y overlay
| Feature | Estado | Detalle |
|---------|--------|---------|
| Índices NDRE/EVI/SAVI/MSAVI/GNDVI/NDWI/NDMI/NBR | hecho | Tab Espectral |
| API índices | hecho | `GET .../spectral/indices` |
| Offline spectral | hecho | Fuente sintética |
| Sentinel Hub stub | stub | `sentinel_hub_stub` |
| CDSE live (Statistical API) | hecho | stg; Production post ToS |
| Overlay mapa (PNG) | hecho | Process PNG + stretch local alrededor de media parcela (contraste en campos áridos) |
| Debounce overlay 300ms | hecho | Perf UI |
| Cache índices (Perf-1/2) | hecho | `source=cache\|live` + refresh |

### Zonas
| Feature | Estado | Detalle |
|---------|--------|---------|
| Fishnet 3×3 + tiers relativos | hecho | Celdas recortadas al polígono (`zones/v3`); cubren toda la parcela |
| API zones | hecho | `GET .../spectral/zones` |
| Contornos MapLibre | hecho | Dibujo de celdas |
| Refresh + badge cache | hecho | `?refresh=1` |
| Snapshots Neon (Perf-3) | hecho | `spectral_zone_snapshots` (ADR-046) |

### Historial / cron / backfill
| Feature | Estado | Detalle |
|---------|--------|---------|
| Historial escenas + sparkline | hecho | Neon `spectral_scenes` |
| Comparar 2 fechas (medias + scrub mapa) | hecho | Δ later−earlier; Mapa fija overlay/zonas (ADR-053) |
| Cron escenas nuevas (6h) | hecho | `new_scene_only` |
| Backfill 30 días on-demand | hecho | `POST .../backfill` |
| `acquiredAt` en UI | hecho | “Captura (satélite)” |
| Tools agente índices/zonas/historial | hecho | Plus; historial para comparar fechas |
| Perf-4 multi-celda 1-call CDSE | hecho | Process primary + Statistical fallback (ADR-047) |
| Perf-5 precompute zones en cron | hecho | Tras escena nueva, 8 índices → snapshots (ADR-048) |
| Smoke perf zones cold vs cache | hecho | Script/smoke de timings Neon vs cold |
| PNG histórico / GIF / slider | planificado | Dual-overlay / Spectral-hist diferido |
| Máscara SCL agresiva | planificado | discovery |

---

## 7. Traceability (piloto café / EUDR)

| Feature | Estado | Detalle |
|---------|--------|---------|
| Gate entitlement | hecho | `traceability` |
| Listar / crear lotes | hecho | `GET\|POST /api/trace/lots` |
| Eventos append-only | hecho | planted / harvested / processed / exported |
| Links parcela ↔ lote | hecho | `trace_parcel_links` |
| Campos EUDR + export readiness | hecho | Trace-4 |
| PATCH completar EUDR | hecho | Solo no-exportados |
| Tab Trazabilidad | hecho | `TraceLotsPanel` |
| Persistencia Neon | hecho | Trace-3 |
| Informe dossier de lote | hecho | Report type |
| Tools agente de lotes | refuse | WQ-17 |
| Multi-actor approval | planificado | Discovery |
| Upload documentos | planificado | Solo `evidenceRef` string hoy |
| API pública EUDR | planificado | LP roadmap |

---

## 8. Agronomic Review

| Feature | Estado | Detalle |
|---------|--------|---------|
| Gate entitlement | hecho | `agronomic_review` |
| Decisiones append-only | hecho | observe / recommend / decide |
| List / create API | hecho | `GET\|POST /api/review/decisions` |
| Tab Revisión | hecho | `ReviewPanel` |
| Persistencia Neon | hecho | Review-2 |
| Edit / delete | refuse | Append-only |
| Tools agente | refuse | Ninguno |
| Workflow multi-aprobación | planificado | Diferido |

---

## 9. Billing

| Feature | Estado | Detalle |
|---------|--------|---------|
| Mapper plan → entitlements | hecho | free, weather_base, weather_plus, operations, full |
| Clerk Billing sandbox + PricingTable | hecho | `/app/billing` |
| Webhook sync entitlements | hecho | `POST /api/webhooks/clerk` |
| Cancel flow | hecho | `/app/billing/cancel` |
| Cuotas miembros / reportes / briefings / parcelas | hecho | `plan-limits.ts` |
| Cobro live Production | planificado | Counsel + Stripe live |
| Precios LP como cotización | refuse | Solo informativos |

---

## 10. Legal

| Feature | Estado | Detalle |
|---------|--------|---------|
| `/legal/terms\|privacy\|refunds\|subscription` | hecho | Counsel-approved; sin banner DRAFT |
| Footer links LP / auth / billing | hecho | `LegalFooterLinks` |
| Aprobación counsel | hecho | 2026-08-29; `docs/ops/legal.md` |
| RUC / dirección operador | hecho | RAW CODE S.A.C. · 20614132206 · Surquillo |

---

## 11. Ops / Infra

| Feature | Estado | Detalle |
|---------|--------|---------|
| Neon + Drizzle migrations | hecho | `drizzle/`, `db:migrate` |
| Dual registry Neon/offline | hecho | parcels, trace, review, reports, spectral, profiles, field notes |
| Cron briefings (11:00 UTC) | hecho | `vercel.json` |
| Cron spectral (cada 6h) | hecho | Plus orgs |
| Email Resend o stub | hecho | Fallback stub |
| PDF Chromium o stub | hecho | `REPORT_PDF_MODE` |
| Smoke / QA scripts | hecho | `smoke:*`, `qa:regression`, `audit:env` |
| Dominios prod / stg | hecho | geoagro.ai / stg.geoagro.ai |
| Feature flags producto | refuse | Solo env switches (`WEATHER_*`, `SPECTRAL_*`) |

---

## 12. Shell UI — tabs

| Tab | Estado | Cubre |
|-----|--------|-------|
| Clima | hecho | Weather obs/forecast |
| Espectral | hecho | Índices, overlay, zonas, historial, backfill |
| Agente | hecho | Chat Plus + tools |
| Perfil | hecho | Perfil agronómico |
| Campo | hecho | Bitácora de campo (texto) |
| Trazabilidad | hecho | Lotes / eventos / EUDR |
| Revisión | hecho | Decisiones agronómicas |

---

## 13. Próximo (backlog corto)

1. **Pre-client QA** — `npm run qa:pre-client` + checklist `docs/ops/pre-client-qa.md`  
2. MVP piloto con usuarios reales (stg / orgs demo)  
3. CDSE Production (post ToS)  
4. SENAMHI live (contrato)  
5. Billing live (Stripe Production) — **diferido** hasta MVP validado  
6. WhatsApp briefing  
7. eve / re-eval model path  

---

## Cómo actualizar este doc

1. Al **cerrar un slice**, actualizar filas afectadas (estado, detalle, fecha arriba).
2. Si se añade un área nueva, crear sección numerada.
3. No borrar filas históricas de `refuse` / non-goals; marcan límites de producto.
4. Commit del inventario junto al slice (o en el mismo commit si el cambio es chico).
