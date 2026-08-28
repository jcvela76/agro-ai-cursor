import { NextResponse } from "next/server";
import { requireOrgAdmin } from "@/lib/require-org-admin";
import {
  getDailyBriefingDeliveryPrefs,
  updateDailyBriefingDeliveryPrefs,
} from "@/infrastructure/container";

export async function GET() {
  const gate = await requireOrgAdmin();
  if (!gate.ok) {
    return NextResponse.json(
      { status: "DELIVERY_PREFS_DENIED", message: gate.message },
      { status: gate.status },
    );
  }

  const data = await getDailyBriefingDeliveryPrefs.execute(gate.orgId);
  return NextResponse.json({ status: "OK", data });
}

export async function PUT(request: Request) {
  const gate = await requireOrgAdmin();
  if (!gate.ok) {
    return NextResponse.json(
      { status: "DELIVERY_PREFS_DENIED", message: gate.message },
      { status: gate.status },
    );
  }

  let body: {
    enabled?: unknown;
    channels?: unknown;
    sendAtLocal?: unknown;
    parcelIds?: unknown;
    emailRecipients?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { status: "DELIVERY_PREFS_DENIED", message: "JSON inválido." },
      { status: 400 },
    );
  }

  const result = await updateDailyBriefingDeliveryPrefs.execute({
    orgId: gate.orgId,
    enabled: body.enabled,
    channels: body.channels,
    sendAtLocal: body.sendAtLocal,
    parcelIds: body.parcelIds,
    emailRecipients: body.emailRecipients,
  });

  if (!result.ok) {
    return NextResponse.json(
      { status: "DELIVERY_PREFS_DENIED", message: result.message },
      { status: 400 },
    );
  }

  return NextResponse.json({ status: "OK", data: result.prefs });
}
