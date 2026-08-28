/**
 * Dual-seed prod parcels (`*-prod-*`) share offline fixtures with their dev canonical ids.
 * See docs/ops/clerk-production-keys.md.
 */
export function resolveOfflineFixtureParcelId(parcelId: string): string {
  if (parcelId.includes("-prod-")) {
    return parcelId.replace("-prod-", "-");
  }
  return parcelId;
}
