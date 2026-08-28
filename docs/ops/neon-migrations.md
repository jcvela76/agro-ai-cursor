# Neon migrations (Drizzle)

## Comandos

| Script | Uso |
|--------|-----|
| `npm run db:generate` | Nueva migración SQL desde `schema.ts` |
| `npm run db:migrate` | Aplica migraciones pendientes (Neon) |
| `npm run db:push` | Sync schema sin journal (solo dev / emergencias) |
| `npm run db:baseline` | Marca migraciones ya aplicadas en el journal |

`drizzle.config.ts` carga `.env.local` automáticamente (`DATABASE_URL` / `DATABASE_URL_UNPOOLED`).

## Baseline (DB creada con `db:push`)

Si `db:migrate` falla porque las tablas ya existen pero `drizzle.__drizzle_migrations` está vacío:

```bash
npm run db:baseline   # idempotente
npm run db:migrate    # debe terminar sin cambios
```

El script `scripts/baseline-drizzle-migrations.ts` inserta los hashes de `drizzle/*.sql` con los `folderMillis` del journal.

## Flujo normal (post-baseline)

1. Cambiar `src/infrastructure/db/schema.ts`
2. `npm run db:generate`
3. Revisar SQL en `drizzle/`
4. `npm run db:migrate` en local/stg/prod
