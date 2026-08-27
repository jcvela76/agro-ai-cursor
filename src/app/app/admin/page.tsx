import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AdminPanel } from "@/ui/admin-panel";

export default async function AdminPage() {
  const { userId, orgId, has } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }
  if (!orgId || !has({ role: "org:admin" })) {
    redirect("/app");
  }

  return <AdminPanel />;
}
