# Smoke Trace-4 — EUDR export gate

## Local (application)

```bash
npm run smoke:trace-eudr
SMOKE_NEON=1 npm run smoke:trace-eudr   # requiere DATABASE_URL
```

Espera: create incomplete → export `eudr_incomplete` → create complete → export `exported`.

## Production (UI)

Org: **Lima Coffee** · parcela `parcel-lima-norte-001` · tab Trazabilidad.

1. Crear lote incompleto (sin fin de producción / sin declaración) vinculado.
2. Añadir evento **Exportación** → debe fallar (mensaje EUDR incomplete).
3. Crear lote completo: productor, PE, fin producción, declaración ON, vinculado.
4. Añadir **Exportación** → lote queda **Exportado**.
5. Reload: lote exportado sigue presente (Neon).
