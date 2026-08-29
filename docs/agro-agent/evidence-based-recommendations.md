# Recomendaciones agronómicas basadas en evidencia (Agro Agent)

Orientación para producto y prompts. El agente **no ejecuta** acciones ni prescribe dosis; sintetiza señales de tools con procedencia explícita.

**Límite WQ-18:** permitido = interpretación condicionada con citas. Prohibido = orden imperativa, inventar datos, pronóstico fuera de horizonte, suplir Agronomic Review o alertas oficiales.

---

## Variantes implementables hoy (tools existentes)

### 1. Balance hídrico indicativo (riego / humedad)

| Señal | Tool | Uso en la recomendación |
|-------|------|-------------------------|
| Lluvia / T / HR / viento observados | `getParcelWeatherObservation` | Último día: precipitación, temperatura, HR aire 2 m, viento 2 m (HR ≠ suelo) |
| Pronóstico de precipitación | `getParcelWeatherForecast` | Días sin lluvia esperada en horizonte corto |
| Lluvia acumulada 30 d | `getParcelRainfall30d` | Déficit o exceso **reciente** (pasado, no futuro) |
| ET0 acumulada campaña | `getParcelEt0` | Demanda atmosférica de referencia (no ETc del cultivo) |
| Estrés hídrico canopy | `getParcelVegetationIndices` → NDWI, NDMI | Proxy de contenido de agua / estrés |

**Ejemplo de framing:** “En los últimos 30 d acumuló X mm; ET0 YTD Z mm; pronóstico sin precipitación hasta [validTo]; NDWI en [rango]. Los datos apuntan a **revisar** necesidad de riego en campo; no sustituye tensiómetro ni decisión del agrónomo.”

### 2. Ventana de labores al aire libre

| Señal | Tool |
|-------|------|
| Días con menor P(precip) | `getParcelLowRainDays` |
| Detalle diario | `getParcelWeatherForecast` |

**Framing:** “Los días con menor probabilidad de lluvia en el horizonte disponible son…; ventana relativa, no garantía.”

### 3. Expectativa de lluvia (acotada al horizonte)

| Pregunta del usuario | Respuesta honesta |
|----------------------|-------------------|
| “¿Lloverá la próxima semana?” | Suma/probabilidades del pronóstico + `validTo` |
| “¿Y el próximo mes?” | **No hay tool mensual** → lluvia 30d pasada + pronóstico N días; no extrapolar |

### 4. Vigur / estrés vegetativo

| Índice | Tool | Lectura típica (con leyenda) |
|--------|------|----------------------------|
| NDRE | `getParcelVegetationIndices` | Clorofila / vigor |
| EVI, GNDVI, MSAVI, SAVI | idem | Biomasa / cobertura |
| NDWI, NDMI | idem | Agua en vegetación / humedad |
| NBR | idem | Estrés / daño (contexto) |

**Framing:** citar `satelliteMission`, fecha de escena, valor y leyenda; no diagnosticar plaga o enfermedad.

### 5. Desarrollo fenológico (proxy térmico)

| Señal | Tool |
|-------|------|
| GDD campaña YTD base 10 °C | `getParcelGdd` |

**Framing:** “Acumulación térmica sugiere etapa **aproximada**; calibrar con cultivo y observación de campo.”

### 6. Contexto de campaña lluviosa

| Señal | Tool |
|-------|------|
| YTD vs mismo rango año anterior | `getParcelRainfallCampaignComparison` |

**Framing:** “Campaña va +X mm vs año anterior según método [id].”

### 7. Condiciones para fumigación / cosecha (solo clima-espectral)

Usar:

- `getParcelWeatherObservation` → HR aire y velocidad de viento del último día (pueden ser `null`; sin dirección)
- `getParcelLowRainDays` + `getParcelWeatherForecast` → riesgo de lavado por lluvia próxima
- `getParcelVegetationIndices` (NDRE) → vigor para priorizar visitas, no “cosechar ya”

**Framing:** condiciones **favorables o adversas** según datos disponibles; sin producto ni momento exacto.

---

## Variantes futuras (requieren datos o producto adicional)

| Variante | Datos / producto faltante |
|----------|---------------------------|
| ETc y déficit hídrico del cultivo | Kc por cultivo/variedad, ET0 diario |
| Humedad de suelo directa | Sensores o modelo suelo |
| Alerta de helada / granizo | Proveedor de eventos extremos + WQ-19 boundary |
| Recomendación de fertilización | Análisis foliar/suelo, normativa |
| Dosis y volumen de riego | Caudal, eficiencia, tipo de sistema |
| Ventana de aplicación fitosanitaria | Dirección de viento / umbrales de deriva (velocidad HR ya en obs) |
| Riesgo de enfermedad (modelo) | Humedad hoja, cultivar, histórico |
| Priorización de parcelas en la org | Multi-parcela + ranking (fuera de parcela fija) |
| Trazabilidad / export readiness | Producto Traceability (WQ-17) |
| Decisión auditada formal | Agronomic Review append (humano) |

---

## Checklist de calidad de respuesta

- [ ] Se llamó al menos una tool pertinente
- [ ] Cada número tiene fuente y vigencia
- [ ] Horizonte temporal declarado (especialmente pronóstico vs pasado)
- [ ] Lenguaje condicional, no imperativo
- [ ] Límites explícitos (ET0 ≠ riego, índice ≠ suelo)
- [ ] Cierre: decisión operativa del agrónomo

---

## Referencias

- `src/agents/agro-agent/instructions.md` — prompt en runtime
- `docs/weather-first-release.md` — corpus WQ-01..WQ-20
- `docs/product-boundary.md` — límites de producto
