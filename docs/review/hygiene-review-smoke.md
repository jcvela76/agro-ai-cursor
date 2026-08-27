# Hygiene — Review smoke cleanup

Keep canonical fixtures **observe + recommend** Lima Norte. Remove smoke appends from Review-2 / UI smokes.

```bash
npm run db:cleanup:review-smoke          # dry-run
APPLY=1 npm run db:cleanup:review-smoke  # delete
```

Deletes (org Lima Coffee) when:

- `summary` starts with `Smoke`, or
- `evidence_ref` matches `synthetic://smoke-review%` / `ui-smoke-%`

Never deletes: `rev-lima-norte-observe-001`, `rev-lima-norte-recommend-001`.
