# Weather first release

Charter del primer release de Weather base. Define qué debe poder hacer un usuario sin AI, con evidencia completa o estados cerrados honestos.

## Cliente y problema

- **Usuario primario:** agrónomo o responsable de campo con parcelas autorizadas
- **Comprador:** operador del workspace
- **Problema:** información climática difícil de interpretar en el contexto de la parcela exacta, ventana temporal, frescura de fuente y límites del pronóstico
- **Primer resultado:** inspeccionar contexto de observación y pronóstico confiable para una parcela autorizada, sin AI
- **Métrica de trabajo:** proporción de preguntas in-scope respondidas con evidencia completa de fuente, tiempo, alcance espacial y frescura

## Alcance del release

Weather base incluye **solo**:

1. Selección autenticada y autorizada de parcela accesible
2. Una vista de observación ordinaria de una fuente calificada
3. Una vista de pronóstico ordinaria de una fuente calificada
4. Fuente, tiempo de emisión/observación, horizonte válido, alcance espacial, unidades y frescura visibles
5. Estados cerrados: no disponible, obsoleto, rango no soportado, error interno

**Fuera de alcance:** Weather Intelligence Plus, recomendaciones agronómicas, alertas, acciones, Traceability, Agronomic Review, proveedor vivo, persistencia, UI final, beta.

## Corpus de preguntas (WQ)

Lista de especificación de producto — no promesa de veinte pantallas.

| ID | Pregunta candidata | Disposición | Comportamiento requerido |
|----|-------------------|-------------|--------------------------|
| WQ-01 | ¿Cuál es la última temperatura disponible para esta parcela? | BASE | Valor, unidad, tiempo de observación, fuente y alcance espacial |
| WQ-02 | ¿Cuánta precipitación se observó en el último período diario disponible? | BASE | Acumulación acotada e intervalo exacto; latestness dentro del conjunto entregado |
| WQ-03 | ¿Qué precipitación se pronostica para el próximo día disponible? | BASE | Cantidad/probabilidad de fuente; intervalo exacto dentro del conjunto |
| WQ-04 | ¿Cuáles son las temperaturas mínima y máxima pronosticadas en el horizonte? | BASE | Valores, unidades, tiempo de emisión e intervalo válido |
| WQ-05 | ¿Cuándo se emitió este pronóstico y cuándo deja de ser válido? | BASE | Tiempo de emisión y fin de validez sin inferencia |
| WQ-06 | ¿Esta observación o pronóstico sigue siendo suficientemente fresco? | BASE | Política de frescura aceptada y estado cerrado resultante |
| WQ-07 | ¿Qué punto geográfico o grid representa mi parcela? | BASE | Alcance autorizado sin exponer geometría innecesaria |
| WQ-08 | ¿Qué timezone y límites de fecha se usaron? | BASE | Timezone normalizado e intervalo cubierto |
| WQ-09 | ¿Por qué no hay datos para esta parcela o período? | BASE | Razón cerrada segura sin detalles crudos de proveedor |
| WQ-10 | ¿Mi fecha solicitada está fuera del rango soportado? | BASE | Rechazar rango no soportado y mostrar límite disponible |
| WQ-11 | ¿Cuánta lluvia acumuló en los últimos 30 días? | PLUS (agent) | Agregado determinístico NASA/offline; gate `weather_plus`; tool `getParcelRainfall30d` |
| WQ-12 | Comparar precipitación de esta campaña con período de referencia | PLUS (agent) | Método `campaign-vs-prior-year-calendar-ytd/v1`; gate `weather_plus`; tool `getParcelRainfallCampaignComparison` |
| WQ-13 | ¿Qué días tienen menor probabilidad de lluvia en el horizonte? | PLUS (agent) | Método `forecast-low-precip-probability/v1`; gate `weather_plus`; tool `getParcelLowRainDays` |
| WQ-14 | Estimar grados-día de crecimiento para esta parcela | PLUS_LATER | Calculadora aprobada e inputs completos |
| WQ-15 | Estimar evapotranspiración para esta parcela | PLUS_LATER | Método seleccionado; rechazar si faltan datos |
| WQ-16 | Clima de parcela en otro workspace | REFUSE | Denegar sin confirmar existencia |
| WQ-17 | Lotes de trazabilidad afectados por pronóstico | REFUSE | Sin tool ni data de Traceability |
| WQ-18 | ¿Debo fumigar, regar o cosechar ahora? | REFUSE | Explicar límite; no decidir ni ejecutar |
| WQ-19 | Emitir alerta oficial de clima severo | REFUSE | Nunca impersonar autoridad oficial |
| WQ-20 | Rellenar valores faltantes con estimación | REFUSE | Reportar evidencia faltante; nunca inventar |

## Ejemplos de aceptación (WA)

| ID | Dado | Cuando | Entonces |
|----|------|--------|----------|
| WA-01 | Usuario activo con Weather entitlement y parcela autorizada; observación fresca | Abre vista Weather de parcela | Observación y campos de evidencia completos |
| WA-02 | Misma autorización y pronóstico calificado dentro del horizonte | Abre vista de pronóstico | Solo hechos y incertidumbre del proveedor |
| WA-03 | Weather entitlement pero sin capacidad de parcela | Solicita vista de parcela | Acceso denegado sin revelar existencia |
| WA-04 | Capacidad de parcela pero sin Weather entitlement | Solicita datos Weather | Denegado; Parcel Core no otorga Weather |
| WA-05 | Identificador de parcela de otro workspace | Solicita datos Weather | Denegado; error indistinguible de recurso no disponible |
| WA-06 | Fuente obsoleta, faltante o fuera de rango | Solicita vista | Estado de limitación cerrado; sin valor fabricado |
| WA-07 | Weather base activo; Plus ausente o expirado | Abre Weather ordinario | Base disponible; sin llamada a modelo |
| WA-08 | Proveedor retorna forma desconocida o error crudo | Adaptador procesa respuesta | Falla segura; contenido crudo no llega a usuario/logs |

## Casos de amenaza del primer slice

- Enumeración de identificadores de parcela y acceso cross-workspace
- Acceso Weather inferido de visibilidad UI, invitación, trial o billing
- Capacidad Parcel Core usada como atajo de entitlement Weather
- Evidencia obsoleta o faltante presentada como actual
- Confusión de unidad, timezone o intervalo
- Proyección de error o payload crudo de proveedor
- Geometría excesiva en output Weather o telemetría
- Duplicación por timeout/retry de proveedor
- Ejecución de Weather Intelligence cuando gate Plus está ausente

## Non-goals explícitos

- Proveedor meteorológico vivo (SENAMHI, NASA POWER, etc.)
- Persistencia de datos weather
- UI de producto final
- AI conversacional
- Beta con usuarios reales
- Trazabilidad o revisión agronómica
- Pricing o contratos comerciales publicados

## Primer slice de implementación (siguiente sesión)

1. Workspace + parcela mínima sintética
2. Una vista weather offline con fuente explícita
3. Autorización evaluada **antes** de inspeccionar candidatos de proveedor
4. Tests de WA-03, WA-04, WA-05 y al menos un caso WA-01 con fixture sintético
