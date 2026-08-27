import type { AccessResolver } from "@/domain/auth/access-resolver";
import type { AccessSnapshot, ProductEntitlement } from "@/domain/auth/authorize-weather-access";
import { clerkClient } from "@clerk/nextjs/server";

function parseEntitlements(value: unknown): ProductEntitlement[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (item): item is ProductEntitlement =>
      item === "weather" || item === "weather_plus" || item === "traceability",
  );
}

function parseParcelIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string");
}

/** Resolves workspace entitlements from Clerk organization public metadata. */
export class ClerkMetadataAccessResolver implements AccessResolver {
  async resolve(userId: string | null, orgId: string | null): Promise<AccessSnapshot | null> {
    if (!userId || !orgId) {
      return null;
    }

    const client = await clerkClient();
    const membership = await client.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      userId: [userId],
    });

    const member = membership.data[0];
    if (!member) {
      return null;
    }

    const org = await client.organizations.getOrganization({ organizationId: orgId });
    const metadata = org.publicMetadata ?? {};

    return {
      userId,
      orgId,
      isActiveMember: true,
      entitlements: parseEntitlements(metadata.entitlements),
      authorizedParcelIds: parseParcelIds(metadata.authorizedParcelIds),
    };
  }
}
