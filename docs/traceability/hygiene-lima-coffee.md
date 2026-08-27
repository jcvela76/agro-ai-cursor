# Hygiene — Lima Coffee smoke cleanup

Keep canonical **Parcela Norte** + fixture lots A/B. Remove accidental smoke parcels/lots.

```bash
npm run db:cleanup:lima-smoke          # dry-run
APPLY=1 npm run db:cleanup:lima-smoke  # delete
```

Deletes:
- Lots: smoke Neon visual, Smoke EUDR incomplete/ready
- Parcels: Parcela 1 (overlap), Smoke Chosica Este, Smoke Cañete Sur

Also: `PATCH /api/trace/lots/[lotId]` to complete EUDR on non-exported lots (UI «Completar EUDR»).
