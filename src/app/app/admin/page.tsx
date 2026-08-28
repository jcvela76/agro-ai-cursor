import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AdminPanel } from "@/ui/admin-panel";
import { syncOrgMemberLimit } from "@/infrastructure/container";

export default async function AdminPage() {
  const { userId, orgId, has } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }
  if (!orgId || !has({ role: "org:admin" })) {
    redirect("/app");
  }

  if (process.env.CLERK_SECRET_KEY) {
    try {
      await syncOrgMemberLimit.execute(orgId);
    } catch (err) {
      console.error("Member limit sync on admin load failed:", err);
    }
  }

  return <AdminPanel />;
}
