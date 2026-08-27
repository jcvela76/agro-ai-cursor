# AGENTS

## Contexto externo

Lee siempre antes de trabajar:

- ~/Projects/context/agro-ai/overview.md
- ~/Projects/context/agro-ai/decisions.md
- ~/Projects/context/agro-ai/architecture.md (si existe trabajo de arquitectura)

## Convenciones

- Nombres de archivos y carpetas: kebab-case
- Commits: mensajes concisos enfocados en el "por qué"
- No commitear secretos (.env, credentials, keys)

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
