# Product boundary

## Qué es Agro AI

Agro AI ayuda a equipos agrícolas autorizados a entender y gestionar parcelas usando una cadena de evidencia coherente. Es una **hipótesis de plataforma multiproducto**: workspaces activan productos de forma independiente y los usuarios reciben permisos scoped por producto.

### Capacidades candidatas

- Organizaciones, workspaces, miembros y roles
- Parcelas, límites geoespaciales e historial de geometría
- Observaciones de campo y evidencia de soporte
- Clima y contexto espectral
- Consultas conversacionales parcel-aware (con fuentes y incertidumbre explícitas)
- Clasificaciones o predicciones derivadas con procedencia explícita
- Revisión agronómica humana y decisiones append-only
- Registros de auditoría que explican quién decidió qué y con qué evidencia

### Oferta comercial (ADR-060)

| Producto comercial | Rol |
|--------------------|-----|
| **Free** | Adquisición self-serve (`/sign-up` → crear org → `free_org` + `weather`). Clima por parcela con límites (2 parcelas × 25 ha, 2 asientos). Funnel hacia Enterprise. |
| **Enterprise** | B2B dedicado (antes «Plan Dedicado»): software adaptado a IoT/ERP/APIs; cotización tras auditoría tecnológica. No checkout web. |

La landing pública muestra **solo Free + Enterprise**. Los planes Clerk mid (`weather_plus`, `operations`, `full`) siguen existiendo para **piloto / prueba interna** con restricciones, no como oferta de marketing.

### Límites de producto (plataforma)

| Producto | Rol |
|----------|-----|
| **Parcel Core** | Capacidad compartida de plataforma — no se vende ni activa como producto |
| **Weather** | Capacidad Free y base de todo lo demás |
| **Weather Intelligence Plus** | Plataforma interna / piloto (slug `weather_plus`) o capa en contrato Enterprise |
| **Traceability** | Plataforma interna / piloto o capa Enterprise |
| **Agronomic Review** | Plataforma interna / piloto o capa Enterprise |

El runtime de AI conversacional es **infraestructura compartida**, no un producto omnipotente. Weather autoriza las tools que expone al agente.

## Qué NO se hereda del proyecto anterior

- Código fuente o límites de módulos
- Esquemas de base de datos o migraciones
- Tests existentes o conteos de tests
- Versiones de Node, Next.js, React, PostgreSQL o proveedores
- Clerk, Neon o Vercel como elecciones automáticas de vendor
- Proyectos, branches, usuarios, deployments o variables de proveedor
- Fixtures sintéticos, fingerprints o baselines históricos
- Roles runtime, grants, matrices ACL o portadores de credenciales

## Regla clean-room

El repositorio legado (`geo-agro`) solo responde dos preguntas:

1. ¿Qué falló y por qué?
2. ¿Qué riesgo debe prevenir explícitamente el proyecto nuevo?

No puede responder qué arquitectura, esquema o implementación debe ser el nuevo proyecto.

## Mercado inicial

- **País:** Perú
- **Timezone de referencia:** `America/Lima`
- **Cliente hipotético:** equipo agrícola peruano con parcelas georreferenciadas
- **Comprador:** operador del workspace
- **Usuario:** agrónomo o responsable de campo

La operación internacional es un requisito de **portabilidad de diseño**, no autorización de lanzamiento. Cada mercado adicional requiere perfil de jurisdicción/privacy aceptado y tests aplicables.

## Primer track de implementación

**Weather base** — incluye solo:

1. Selección autenticada y autorizada de una parcela accesible
2. Una vista de observación ordinaria de una fuente calificada
3. Una vista de pronóstico ordinaria de una fuente calificada
4. Fuente, tiempo de emisión/observación, horizonte válido, alcance espacial, unidades y frescura visibles
5. Estados cerrados para no disponible, obsoleto, rango no soportado y error interno

Weather Intelligence Plus, recomendaciones agronómicas derivadas, alertas, acciones, Traceability y Agronomic Review **no** forman parte de este release.
