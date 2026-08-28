import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { BillingCancelPanel } from "@/ui/billing-cancel-panel";

export default async function BillingCancelPage() {
  const { userId, orgId, has } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }
  if (!orgId || !has({ role: "org:admin" })) {
    redirect("/app");
  }

  return <BillingCancelPanel />;
}
