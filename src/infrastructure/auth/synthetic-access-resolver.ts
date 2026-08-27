import type { AccessResolver } from "@/domain/auth/access-resolver";
import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";

/** Maps synthetic Clerk identities to access snapshots for dev and tests. */
export class SyntheticAccessResolver implements AccessResolver {
  private readonly snapshots: Map<string, AccessSnapshot>;

  constructor(snapshots: AccessSnapshot[]) {
    this.snapshots = new Map(
      snapshots.map((s) => [`${s.userId}:${s.orgId}`, s]),
    );
  }

  async resolve(userId: string | null, orgId: string | null): Promise<AccessSnapshot | null> {
    if (!userId || !orgId) {
      return null;
    }
    return this.snapshots.get(`${userId}:${orgId}`) ?? null;
  }
}

export const defaultSyntheticSnapshots: AccessSnapshot[] = [
  {
    userId: "user-agronomist-001",
    orgId: "org_3ITi6wk2MTcwXZ1FrMaNZEKfR0G",
    isActiveMember: true,
    entitlements: ["weather"],
    authorizedParcelIds: ["parcel-lima-norte-001"],
  },
  {
    userId: "user-no-parcel-002",
    orgId: "org_3ITi6wk2MTcwXZ1FrMaNZEKfR0G",
    isActiveMember: true,
    entitlements: ["weather"],
    authorizedParcelIds: [],
  },
  {
    userId: "user-parcel-only-003",
    orgId: "org_3ITi6wk2MTcwXZ1FrMaNZEKfR0G",
    isActiveMember: true,
    entitlements: [],
    authorizedParcelIds: ["parcel-lima-norte-001"],
  },
  {
    userId: "user-cross-ws-004",
    orgId: "org-cusco-cacao",
    isActiveMember: true,
    entitlements: ["weather"],
    authorizedParcelIds: ["parcel-cusco-valle-002"],
  },
  {
    userId: "user-plus-005",
    orgId: "org_3ITi6wk2MTcwXZ1FrMaNZEKfR0G",
    isActiveMember: true,
    entitlements: ["weather", "weather_plus"],
    authorizedParcelIds: ["parcel-lima-norte-001"],
  },
];

export const syntheticAccessResolver = new SyntheticAccessResolver(defaultSyntheticSnapshots);
