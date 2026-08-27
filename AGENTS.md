# AGENTS

## Contexto externo

Lee siempre antes de trabajar:

- ~/Projects/context/agro-ai/overview.md
- ~/Projects/context/agro-ai/decisions.md
- ~/Projects/context/agro-ai/architecture.md

Antes de implementar, lee también:

- docs/product-boundary.md
- docs/failure-lessons.md

## Regla clean-room

**No copiar código** de:

- `~/Documents/Codex/.../agro-ai-clean`
- `~/Documents/Codex/workstation/geo-agro`

Esas rutas son referencia read-only para producto y lecciones. Toda implementación se escribe de nuevo en este repo.

## Convenciones

- Nombres de archivos y carpetas: kebab-case
- Commits: mensajes concisos enfocados en el "por qué"
- No commitear secretos (.env, credentials, keys)
- Desarrollo inicial solo con datos sintéticos no-personales
- Autorización evaluada antes de inspeccionar candidatos de proveedor

## Al terminar una sesión

Actualiza ~/Projects/context/agro-ai/session-log.md con:

- Lo completado
- Pendientes
- Decisiones técnicas nuevas (también en decisions.md si aplica)

## Subagents disponibles

Subagents compartidos en ~/Projects/agentes/subagents/:

- `code-reviewer` — revisión post-cambio
- `explore-codebase` — exploración al abrir el proyecto
- `session-handoff` — actualizar contexto al cerrar sesión

## Pendientes conocidos

- **ADR-004:** stack técnico TBD (primera sesión de implementación)
- **Primer slice Weather:** workspace + parcela sintética + vista offline + tests
