import { auth } from "@clerk/nextjs/server";

export async function requireOrgAdmin() {
  const session = await auth();
  const { userId, orgId, has } = session;
  if (!userId || !orgId) {
    return { ok: false as const, status: 401, message: "Authentication and active organization required" };
  }
  if (!has({ role: "org:admin" })) {
    return { ok: false as const, status: 403, message: "Organization admin role required" };
  }
  return { ok: true as const, userId, orgId };
}
