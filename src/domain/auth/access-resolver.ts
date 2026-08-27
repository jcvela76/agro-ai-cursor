import type { AccessSnapshot } from "@/domain/auth/authorize-weather-access";

export interface AccessResolver {
  resolve(userId: string | null, orgId: string | null): Promise<AccessSnapshot | null>;
}
