import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId, orgId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <h1 style={{ margin: 0 }}>Agro AI</h1>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <OrganizationSwitcher hidePersonal afterSelectOrganizationUrl="/" />
          <UserButton />
        </div>
      </header>
      <p>
        Org activa: <code>{orgId ?? "(ninguna — selecciona Lima Coffee arriba)"}</code>
      </p>
      <p>API weather v1:</p>
      <ul>
        <li>
          <Link href="/api/parcels/parcel-lima-norte-001/weather/observation">
            observation
          </Link>
        </li>
        <li>
          <Link href="/api/parcels/parcel-lima-norte-001/weather/forecast">forecast</Link>
        </li>
      </ul>
    </main>
  );
}
