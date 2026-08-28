"use client";

import { InviteMembersButton, useOrganization } from "@clerk/nextjs";
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

export function OrgMembersPanel() {
  const { isLoaded, memberships, invitations } = useOrganization({
    memberships: { infinite: true, pageSize: 20 },
    invitations: { infinite: true, pageSize: 20 },
  });

  if (!isLoaded) {
    return <p className={styles.muted}>Cargando miembros…</p>;
  }

  const members = memberships?.data ?? [];
  const pending = invitations?.data ?? [];

  return (
    <div className={styles.panel}>
      <div className={styles.toolbar}>
        <InviteMembersButton>
          <Button type="button">Invitar miembro</Button>
        </InviteMembersButton>
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
        Cambios de rol y revocaciones avanzadas: usa el modal de Clerk al invitar o desde el
        dashboard de Clerk (Development).
      </p>
    </div>
  );
}
