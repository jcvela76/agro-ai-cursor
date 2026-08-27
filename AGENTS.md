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
- **Cada slice cerrado = un commit + push** (ver `.cursor/rules/slice-commit-push.mdc`)
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

## MCP y skills (auth / browser)

Configurados en `~/.cursor/mcp.json`:

- **clerk** — snippets SDK (`b2b-saas`, `organizations`, `server-side`)
- **playwright** — automatización de browser
- **MCP_DOCKER** — gateway (incluye playwright + GitHub)

Skills locales en `.agents/skills/`:

- Clerk: `clerk-setup`, `clerk-orgs`, `clerk-nextjs-patterns`
- Neon: `neon`, `neon-postgres`, `neon-postgres-branches`

MCP Neon (Docker catalog) requiere `neon.api_key`:

```bash
docker mcp secret set neon.api_key=<api-key-from-console.neon.tech>
```

Para cambios de instancia Clerk (orgs, metadata) preferir **Backend API** con `CLERK_SECRET_KEY`; el browser MCP no hereda tu sesión SSO de Vercel.

## Pendientes conocidos

- eve init (diferido post UI-5; ADR-014)
- Re-evaluar model path (ADR-015): Gateway vs OpenAI key directa vs Bedrock / eve
- Cobro Billing **live** en Production (checklist `docs/ops/billing.md`; sandbox Billing-1 hecho)
- SENAMHI paid stub (slice 2; detrás de entitlement)

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
