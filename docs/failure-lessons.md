# Failure lessons

Lecciones destiladas del audit del proyecto anterior. Cada patrón incluye una regla de prevención testeable.

## 1. Autoridad acumulada en lugar de reemplazada

**Problema:** Múltiples generaciones de documentos coexistían. Un cambio requería reconciliar muchos owners históricos.

**Prevención:** Un plan activo, un conjunto canónico pequeño de docs, e historial archivado sin routing operacional.

## 2. Reproducibilidad dependía del historial de tareas

**Problema:** Expectativas vivían en handoffs privados, fixtures retenidos o contexto conversacional.

**Prevención:** Toda expectativa no-secreta necesaria para un test proviene de fixtures versionados. Secretos se suministran por mecanismo runtime documentado, nunca como input de test o arquitectura.

## 3. Estado remoto persistente usado demasiado pronto

**Problema:** Validación remota dependía de base de datos Neon, proyecto Vercel e identidad Clerk retenidos.

**Prevención:** Infraestructura local desechable primero; tests remotos crean recursos aislados desde prestate vacío conocido y los destruyen por identidad exacta.

## 4. Tooling se convirtió en prueba del producto

**Problema:** Calificación de Vercel CLI, OAuth cleanup, sandbox activation y controladores custom se volvieron prerrequisitos arquitectónicos.

**Prevención:** Elegir superficies de proveedor con contratos oficiales simples; mantener adaptadores fuera del dominio; no construir plataforma de seguridad custom solo para un smoke test.

## 5. Versiones no representadas por un contrato exacto

**Problema:** Engine amplio (`24.x`) coexistía con pin Volta exacto; rangos compatibles vs bytes exactos esperados.

**Prevención:** Un runtime exacto, un package manager exacto, lockfile commiteado, CI clean-install y matriz de versiones testeada antes del trabajo de producto.

## 6. Bootstrap y upgrade conflados

**Problema:** El mismo mecanismo no podía probar bootstrap vacío e upgrade incremental de migraciones.

**Prevención:** Tests y comandos separados para bootstrap vacío, upgrade de un paso, replay completo y rollback. Cada migración posee prueba forward e inverse.

## 7. Tests verificaban declaraciones, no comportamiento

**Problema:** Inspección de strings en source, clientes fake, digests auto-generados.

**Prevención:** Oráculos independientes, dependencias reales desechables, fixtures adversariales y controles negativos tipo mutación.

## 8. Seguridad modelada como prueba global tardía

**Problema:** ACL, roles, privacy y cleanup se ensamblaron después de muchas capas de producto.

**Prevención:** Cada vertical slice añade sus propios tests de autorización, aislamiento, privacy, abuso y cleanup cuando se introduce el comportamiento.

## 9. Cantidad de tests ocultaba ownership

**Problema:** Cientos de tests requerían inventarios globales para explicar qué formaba el release gate.

**Prevención:** Tests viven junto a su slice owner, tags explícitos por nivel, pipeline CI pequeño y fijo. Tests nuevos se incluyen automáticamente.

## 10. Una operación con múltiples paths de ejecución

**Problema:** Clientes DB directos, tools de proveedor, CLIs, dashboards y controladores custom para tareas similares.

**Prevención:** Un path aprobado por operación. Si falla, parar y reconsiderar arquitectura — no añadir fallback dentro de la misma fase.

## Patrones prohibidos

- Requisitos operacionales solo en chats o handoffs
- Reutilizar recurso persistente de proveedor como baseline de integración
- Rangos amplios de versiones para tooling fundacional
- Aserciones sobre source text presentadas como prueba runtime
- Digests auto-generados como evidencia independiente
- Éxito fake de DB presentado como comportamiento PostgreSQL
- Hardening de seguridad diferido hasta después de features
- Certificación ACL global antes de tests de autorización por slice
- Múltiples fallbacks de proveedor o SQL en un workflow
- Packets de documentación para comandos o retries individuales
- Estados PASS que requieren identificador privado no disponible para reproducir
- Claims de cleanup sin registro de recursos creados e identidad exacta

## Conclusión

El proyecto anterior contiene pensamiento de producto valioso, pero su arquitectura de verificación operacional no es base segura para otro reset. Este proyecto parte de requisitos de producto y demuestra independientemente cada elección arquitectónica.
