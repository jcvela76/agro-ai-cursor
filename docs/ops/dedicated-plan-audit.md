# Plan Dedicado — auditoría tecnológica (DRAFT)

**Estado:** borrador interno · no es oferta vinculante  
**Fecha:** 2026-08-31  
**Relacionado:** LP tarjeta «Dedicado» · `src/content/landing/pricing.ts` · `/legal/subscription`  
**Contacto comercial:** `hola@geoagro.ai`

---

## 1. Propósito

El **Plan Dedicado** sirve cuando el cliente necesita Agro AI **adaptado a sus sistemas** (IoT, ERP, APIs, sensores, hojas de campo, etc.), no solo el SaaS self-serve (Básico / Profesional / Empresa).

La **auditoría tecnológica** es el paso previo obligatorio: entiende qué datos existen, cómo fluyen, qué se puede integrar con seguridad y qué conviene construir a medida. El precio del plan Dedicado **no se publica** en checkout; sale de la propuesta post-auditoría.

**Base de producto:** Operations Intelligence (`operations` / `full`) o superior — clima, Plus, trazabilidad y revisión agronómica como plataforma; encima, capas custom.

---

## 2. Cuándo aplica

| Señal | Ejemplo |
|-------|---------|
| Fuentes propias | Estaciones IoT, sensores de humedad, PLC de riego |
| Sistemas de negocio | ERP agrícola, WMS, nómina de campo, CRM exportador |
| Datos legados | Excel / Google Sheets / bases SQL internas con parcelas y labores |
| Requisitos de marca | Branding, roles y flujos distintos al producto estándar |
| Compliance / volumen | Multi-fundo, multi-país, SLA contractual, SSO corporativo |

**No aplica** si el cliente solo necesita el SaaS estándar → planes Profesional / Empresa.

---

## 3. Alcance de la auditoría (qué incluye)

### Fase A — Descubrimiento (kickoff)

- Objetivos de negocio y usuarios (productor, técnico, gerencia, exportador)
- Parcelas / fundos en alcance (cantidad, geografía, cultivos)
- Inventario de sistemas actuales (ERP, IoT, APIs, archivos, terceros)
- Restricciones: seguridad, red, datos personales (Ley 29733), confidencialidad
- Criterios de éxito del piloto dedicado (qué “listo” significa)

### Fase B — Datos y arquitectura

- Mapa de fuentes → consumidores (quién escribe / quién lee)
- Esquemas o muestras: parcelas, clima local, labores, lotes, sensores
- Cadencia y frescura (tiempo real, diario, batch)
- Identificadores comunes (parcela, lote, usuario) y gaps de join
- Calidad / huecos / duplicados; riesgo de falsa precisión vs modelo público (~9 km)

### Fase C — Integración y seguridad

- Opciones de integración: API REST, webhooks, SFTP/batch, MQTT/IoT, conector ERP
- Auth (API keys, OAuth, VPN, IP allowlist) y entorno (prod / staging)
- Ownership de datos y retención
- Impacto en entitlements / workspace Agro AI (qué queda en producto vs custom)

### Fase D — Roadmap y estimación

- Backlog priorizado (Must / Should / Could)
- Estimación de esfuerzo (días-persona) por ítem
- Dependencias del cliente (accesos, samples, ventanas de cambio)
- Propuesta comercial: fee de implementación + fee recurrente (si aplica)

---

## 4. Entregables

| Entregable | Descripción |
|------------|-------------|
| **Informe de auditoría** | PDF/Markdown: sistemas, flujos, riesgos, recomendaciones |
| **Diagrama de arquitectura** | Fuentes → Agro AI → consumidores (1 página) |
| **Matriz de integraciones** | Sistema · protocolo · owner · esfuerzo · prioridad |
| **Backlog dedicado v0** | Epics + criterios de aceptación (piloto 30–90 días) |
| **Propuesta comercial** | Alcance, timeline, precio (implementación + opcional retainer) |

Opcional (si el cliente lo pide y está en el SOW):

- Workshop presencial / remoto con TI + agronomía (2–4 h)
- Spike técnico de 1 conector (spike ≠ producción)

---

## 5. Fuera de alcance (salvo SOW aparte)

- Desarrollo de producción de conectores IoT/ERP **antes** de firmar la propuesta
- Certificación EUDR, ISO u otras auditorías legales/regulatorias
- Compra o instalación de hardware (estaciones, gateways)
- Migración masiva de datos históricos sin muestra controlada
- SLA 24/7 o soporte on-site permanente (solo si el contrato Dedicado lo incluye)
- Sustitución del agrónomo colegiado o prescripciones de dosis/riego

---

## 6. Duración orientativa

| Tamaño | Duración típica | Notas |
|--------|-----------------|-------|
| **S** — 1 fundo, 1–2 fuentes | 1–2 semanas | Samples + 2 sesiones |
| **M** — multi-fundo, ERP o IoT | 2–4 semanas | Accesos TI + workshop |
| **L** — multi-sistema / multi-país | 4–8 semanas | Por fases; puede partirse |

Contador arranca cuando el cliente entrega **accesos o muestras** acordados en kickoff.

---

## 7. Precio orientativo (interno — validado Julio 2026-08-31)

> Rangos SaaS comerciales: no publicar en LP hasta decisión marketing/counsel.  
> **Piloto 2026:** la auditoría tecnológica **puede ofrecerse sin fee** (ver §7.1).

### 7.1 Auditoría en fase piloto (decisión 2026-08-31)

Durante el piloto abierto, Agro AI puede incluir una **auditoría tecnológica sin cargo** para leads calificados que evalúan el Plan Dedicado.

| Regla | Detalle |
|-------|---------|
| **Quién** | Productores / cooperativas / exportadores en lista de espera o referidos piloto (Perú) |
| **Cupo** | Limitado; priorizar fit (IoT/ERP real + horizonte de implementación) |
| **Tamaño típico** | Preferir **S**; **M** solo si hay samples y TI disponible |
| **L** | No gratis por defecto — cotizar o partir en fases |
| **Qué recibe** | Mismos entregables §4 (informe, diagrama, matriz, backlog v0) |
| **Qué no incluye** | Implementación de conectores, UI custom ni retainer |
| **Propuesta post-auditoría** | Implementación Dedicado sigue a cotizar; fee de auditoría comercial (tabla abajo) aplica **después** del piloto |
| **Documentación** | SOW corto de auditoría piloto (NDA si hay datos sensibles) |

Si el lead no califica o el alcance es L, usar la tabla de fee único (§7.2).

### 7.2 Auditoría (fee único — post-piloto / no calificado)

| Tamaño | Rango USD (orientativo) |
|--------|-------------------------|
| S | 1 500 – 3 500 |
| M | 3 500 – 8 000 |
| L | 8 000 – 18 000+ |

Puede **acreditarse parcialmente** contra el primer hito de implementación (política a definir por contrato).

### 7.3 Post-auditoría (fuera de este draft, solo marco)

| Concepto | Orientación |
|----------|-------------|
| Implementación piloto (conectores + UI custom) | Cotización por backlog; típicamente múltiplo del fee de auditoría |
| Recurrencia Dedicado | Base SaaS Operations/Full **+** fee de plataforma/soporte custom (mensual o anual) |
| Cambios de alcance | Change order; no incluidos en fee fijo de auditoría |

---

## 8. Proceso comercial

```text
Lead «Agendar auditoría»
  → intake (rol, sistemas, plazos)
  → ¿piloto calificado?
        sí → SOW auditoría piloto (sin fee) + NDA si aplica
        no → SOW con fee S/M/L
  → kickoff + acceso a samples
  → informe + propuesta Dedicado
  → contrato implementación / retainer
  → build en workspace dedicado
```

**SLA de respuesta comercial:** 48 h hábiles al primer correo (alineado a waitlist LP).

---

## 9. Checklist de intake (correo / call)

- [ ] Organización y contactos (negocio + TI)
- [ ] Cultivos / regiones / nº de parcelas aproximado
- [ ] Sistemas a integrar (nombre, versión, API sí/no)
- [ ] Datos sensibles / requisitos de residencia
- [ ] Plazo deseado de piloto
- [ ] ¿Califica auditoría piloto sin fee? (fit IoT/ERP + cupo)
- [ ] Presupuesto aproximado (banda) si el cliente lo comparte — no obligatorio en piloto

---

## 10. Pendiente para cerrar este draft

- [x] Validar rangos USD con Julio (2026-08-31 — razonable)
- [x] Auditoría **sin fee** en piloto para leads calificados (2026-08-31)
- [ ] Plantilla SOW + NDA (counsel) — variante «auditoría piloto»
- [ ] Página o anexo público mínimo (sin precios de fee) vs solo mailto
- [ ] ADR corto si Dedicado se convierte en producto formal (entitlements / billing fuera de Clerk PricingTable)

---

## Referencias

- Precios SaaS self-serve: `docs/ops/billing.md`, `docs/ops/clerk-billing-plans.json`
- Copy LP: `src/content/landing/pricing.ts`
- Legal planes: `src/content/legal/documents.ts` (`/legal/subscription`)
