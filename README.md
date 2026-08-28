# Agro AI

Plataforma agronómica multiproducto centrada en parcelas. Proyecto **clean room**: cero código heredado del legado; contexto de producto importado como documentación.

## Documentación

| Doc | Contenido |
|-----|-----------|
| [product-boundary.md](docs/product-boundary.md) | Qué es, qué no es, regla clean-room |
| [failure-lessons.md](docs/failure-lessons.md) | 10 lecciones del proyecto anterior |
| [roadmap.md](docs/roadmap.md) | Secuencia de entrega simplificada |
| [weather-first-release.md](docs/weather-first-release.md) | Charter Weather v1, corpus WQ/WA |

## Contexto del agente (fuera del repo)

Memoria persistente en `~/Projects/context/agro-ai/`:

- `overview.md` — objetivo, mercado, productos, estado
- `architecture.md` — diagrama conceptual y principios
- `decisions.md` — ADRs del proyecto nuevo
- `session-log.md` — notas post-sesión

## Workspace

Este proyecto vive en el workspace `~/Projects/`:

```bash
pj              # cd ~/Projects
newpj <name>    # crear otro proyecto
```

Abrir siempre la carpeta del proyecto (`~/Projects/agro-ai/`), no la raíz `~/Projects/`.

## Estado

- **Fase:** Foundation + Weather offline slice
- **Stack:** Next.js 16 + Clerk + Vitest
- **Próximo paso:** Clerk en Vercel, remoto `agro-ai-cursor`, proveedores live

## Setup local

```bash
cp .env.example .env.local   # añadir Clerk keys
npm install
npm test
npm run dev
```

## API (v1)

| Método | Ruta | Auth |
|--------|------|------|
| GET | `/api/parcels/[parcelId]/weather/observation` | Clerk + weather entitlement |
| GET | `/api/parcels/[parcelId]/weather/forecast` | Clerk + weather entitlement |
| GET | `/api/parcels/[parcelId]/spectral/indices` | Clerk + `weather_plus` |
| POST | `/api/agent/chat` | Clerk + weather_plus |

Clerk org `publicMetadata`:

```json
{
  "entitlements": ["weather", "weather_plus"],
  "authorizedParcelIds": ["parcel-lima-norte-001"]
}
```

## Referencias read-only

Solo consulta histórica — **no copiar código**:

- `~/Documents/Codex/.../agro-ai-clean`
- `~/Documents/Codex/workstation/geo-agro`
