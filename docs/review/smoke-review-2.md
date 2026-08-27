# Smoke Review-2 — Agronomic Review persistence

## Local (application)

```bash
npm run smoke:review
SMOKE_NEON=1 npm run smoke:review   # requiere DATABASE_URL
```

Espera: gate deny → list → append `decide` → list incluye → cross-org blocked.

## Production (UI) — 2026-08-27

Deploy: `614f38e` READY · org Lima Coffee · entitlement `agronomic_review` activado.

| Check | Result |
|-------|--------|
| Tab Revisión | PASS |
| Seed observe + recommend | PASS |
| Append Neon (smoke script) visible | PASS (`Smoke Review 2026-08-27-16-36-43`) |
| Persistencia Neon | PASS (rows en `review_decisions`) |

## Local (application) — 2026-08-27

```
PASS [offline] gate deny → list → append decide → list includes → cross-org blocked
PASS [neon]    same (SMOKE_NEON=1)
```
