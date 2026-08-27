import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  getWorkspaceSettings,
  updateWorkspaceSettings,
} from "@/infrastructure/container";

async function requireOrgAdmin() {
  const session = await auth();
  const { userId, orgId, has } = session;
  if (!userId || !orgId) {
    return { ok: false as const, status: 401, message: "Authentication and active organization required" };
  }
  const isAdmin = has({ role: "org:admin" });
  if (!isAdmin) {
    return { ok: false as const, status: 403, message: "Organization admin role required" };
  }
  return { ok: true as const, orgId };
}

export async function GET() {
  const gate = await requireOrgAdmin();
  if (!gate.ok) {
    return NextResponse.json(
      { status: "WORKSPACE_SETTINGS_DENIED", message: gate.message },
      { status: gate.status },
    );
  }

  const data = await getWorkspaceSettings.execute(gate.orgId);
  return NextResponse.json({ status: "OK", data });
}

export async function PATCH(request: Request) {
  const gate = await requireOrgAdmin();
  if (!gate.ok) {
    return NextResponse.json(
      { status: "WORKSPACE_SETTINGS_DENIED", message: gate.message },
      { status: gate.status },
    );
  }

  let body: { entitlements?: unknown; authorizedParcelIds?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { status: "WORKSPACE_SETTINGS_DENIED", message: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const data = await updateWorkspaceSettings.execute({
    orgId: gate.orgId,
    entitlements: body.entitlements ?? [],
    authorizedParcelIds: body.authorizedParcelIds ?? [],
  });

  return NextResponse.json({ status: "OK", data });
}
