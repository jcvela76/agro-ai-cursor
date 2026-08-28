"use client";

import { InviteMembersButton, useOrganization } from "@clerk/nextjs";
import Link from "next/link";
import { memberSeatUsage } from "@/domain/billing/plan-limits";
import { planDisplayLabel } from "@/domain/billing/plan-display";
import { Button } from "@/ui/button";
import styles from "./org-members-panel.module.css";

function formatRole(role: string): string {
  if (role === "org:admin") {
    return "Admin";
  }
  if (role === "org:member") {
    return "Miembro";
  }
  return role.replace(/^org:/, "");
}

function billingPlanSlugFromOrg(
  publicMetadata: Record<string, unknown> | undefined,
): string | null {
  const slug = publicMetadata?.billingPlanSlug;
  return typeof slug === "string" ? slug : null;
}

export function OrgMembersPanel() {
  const { isLoaded, organization, memberships, invitations } = useOrganization({
    memberships: { infinite: true, pageSize: 20 },
    invitations: { infinite: true, pageSize: 20 },
  });

  if (!isLoaded) {
    return <p className={styles.muted}>Cargando miembros…</p>;
  }

  const members = memberships?.data ?? [];
  const pending = invitations?.data ?? [];
  const planSlug = billingPlanSlugFromOrg(
    organization?.publicMetadata as Record<string, unknown> | undefined,
  );
  const seats = memberSeatUsage({
    activeMembers: organization?.membersCount ?? members.length,
    pendingInvites: pending.length,
    planSlug,
  });

  return (
    <div className={styles.panel}>
      <p className={styles.usage}>
        <strong>
          {seats.used} / {seats.limit}
        </strong>{" "}
        asientos ({planDisplayLabel(planSlug)}) — activos + invitaciones pendientes
      </p>

      <div className={styles.toolbar}>
        {seats.blocked ? (
          <div className={styles.limitBox}>
            <p className={styles.limitText}>
              Límite de miembros alcanzado en este plan. Sube de tier en{" "}
              <Link className={styles.limitLink} href="/app/billing">
                Suscripción
              </Link>{" "}
              para invitar a más personas.
            </p>
            <Button type="button" disabled>
              Invitar miembro
            </Button>
          </div>
        ) : (
          <InviteMembersButton>
            <Button type="button">Invitar miembro</Button>
          </InviteMembersButton>
        )}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Usuario</th>
              <th scope="col">Rol</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={2} className={styles.empty}>
                  No hay miembros en este workspace.
                </td>
              </tr>
            ) : (
              members.map((member) => {
                const user = member.publicUserData;
                const name =
                  [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
                  user?.identifier ||
                  "Usuario";
                return (
                  <tr key={member.id}>
                    <td>
                      <strong>{name}</strong>
                      {user?.identifier ? (
                        <span className={styles.email}>{user.identifier}</span>
                      ) : null}
                    </td>
                    <td>{formatRole(member.role)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pending.length > 0 ? (
        <div className={styles.pending}>
          <h3 className={styles.pendingTitle}>Invitaciones pendientes</h3>
          <ul className={styles.pendingList}>
            {pending.map((invite) => (
              <li key={invite.id}>
                <span>{invite.emailAddress}</span>
                <span className={styles.pendingRole}>{formatRole(invite.role)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className={styles.hint}>
        Solo <strong>org:admin</strong> puede invitar. Cambios de rol avanzados vía modal de Clerk
        al invitar o en el dashboard Development.
      </p>
    </div>
  );
}
