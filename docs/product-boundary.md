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

### Límites de producto

| Producto | Rol |
|----------|-----|
| **Parcel Core** | Capacidad compartida de plataforma — no se vende ni activa como producto |
| **Weather** | Primer producto implementable |
| **Weather Intelligence Plus** | Add-on de pago/trial dentro de Weather — posterior a Weather base |
| **Traceability** | Producto separado (piloto coffee/EUDR) |
| **Agronomic Review** | Producto separado — Review-1 (append-only) |

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
