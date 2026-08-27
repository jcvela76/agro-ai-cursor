import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { BillingPanel } from "@/ui/billing-panel";

export default async function BillingPage() {
  const { userId, orgId, has } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }
  if (!orgId || !has({ role: "org:admin" })) {
    redirect("/app");
  }

  return <BillingPanel />;
}
