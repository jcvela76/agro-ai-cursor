"use client";

import { useAuth, useOrganization } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
  const router = useRouter();
  const { userId: currentUserId } = useAuth();
  const { isLoaded, organization, memberships, invitations } = useOrganization({
    memberships: { infinite: true, pageSize: 20 },
    invitations: { infinite: true, pageSize: 20 },
  });
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

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

  async function removeMember(userId: string) {
    setRemovingUserId(userId);
    setInviteError(null);
    try {
      const response = await fetch(`/api/org/members/${userId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setInviteStatus("error");
        setInviteError(payload.message ?? "No se pudo quitar al miembro");
        return;
      }
      await organization?.reload();
      router.refresh();
    } catch {
      setInviteStatus("error");
      setInviteError("Error de red al quitar al miembro");
    } finally {
      setRemovingUserId(null);
    }
  }

  async function revokeInvite(invitationId: string) {
    setRevokingId(invitationId);
    try {
      const response = await fetch(`/api/org/invitations/${invitationId}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setInviteStatus("error");
        setInviteError(payload.message ?? "No se pudo revocar la invitación");
        return;
      }
      await organization?.reload();
      router.refresh();
    } catch {
      setInviteStatus("error");
      setInviteError("Error de red al revocar la invitación");
    } finally {
      setRevokingId(null);
    }
  }

  async function sendInvite(event: React.FormEvent) {
    event.preventDefault();
    const email = inviteEmail.trim();
    if (!email) {
      return;
    }
    setInviteStatus("sending");
    setInviteError(null);
    try {
      const response = await fetch("/api/org/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailAddress: email }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setInviteStatus("error");
        setInviteError(payload.message ?? "No se pudo enviar la invitación");
        return;
      }
      setInviteStatus("sent");
      setInviteEmail("");
      await organization?.reload();
      router.refresh();
    } catch {
      setInviteStatus("error");
      setInviteError("Error de red al enviar la invitación");
    }
  }

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
          <form className={styles.inviteForm} onSubmit={sendInvite}>
            <label className={styles.inviteLabel} htmlFor="invite-email">
              Email
            </label>
            <div className={styles.inviteRow}>
              <input
                id="invite-email"
                className={styles.inviteInput}
                type="email"
                name="email"
                autoComplete="off"
                placeholder="colega@empresa.com"
                value={inviteEmail}
                onChange={(event) => {
                  setInviteEmail(event.target.value);
                  if (inviteStatus !== "idle") {
                    setInviteStatus("idle");
                    setInviteError(null);
                  }
                }}
                disabled={inviteStatus === "sending"}
                required
              />
              <Button type="submit" disabled={inviteStatus === "sending" || inviteEmail.trim() === ""}>
                {inviteStatus === "sending" ? "Enviando…" : "Invitar miembro"}
              </Button>
            </div>
            {inviteStatus === "sent" ? (
              <p className={styles.inviteSuccess}>Invitación enviada. El enlace lleva a este workspace.</p>
            ) : null}
            {inviteStatus === "error" && inviteError ? (
              <p className={styles.inviteError}>{inviteError}</p>
            ) : null}
          </form>
        )}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Usuario</th>
              <th scope="col">Rol</th>
              <th scope="col" className={styles.actionsCol}>
                <span className={styles.srOnly}>Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 ? (
              <tr>
                <td colSpan={3} className={styles.empty}>
                  No hay miembros en este workspace.
                </td>
              </tr>
            ) : (
              members.map((member) => {
                const user = member.publicUserData;
                const memberUserId = user?.userId ?? null;
                const name =
                  [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
                  user?.identifier ||
                  "Usuario";
                const canRemove =
                  memberUserId !== null &&
                  memberUserId !== currentUserId &&
                  member.role !== "org:admin";
                return (
                  <tr key={member.id}>
                    <td>
                      <strong>{name}</strong>
                      {user?.identifier ? (
                        <span className={styles.email}>{user.identifier}</span>
                      ) : null}
                    </td>
                    <td>{formatRole(member.role)}</td>
                    <td className={styles.actionsCol}>
                      {canRemove ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className={styles.revokeButton}
                          disabled={removingUserId === memberUserId}
                          onClick={() => void removeMember(memberUserId)}
                        >
                          {removingUserId === memberUserId ? "Quitando…" : "Quitar"}
                        </Button>
                      ) : null}
                    </td>
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
                <div className={styles.pendingMain}>
                  <span>{invite.emailAddress}</span>
                  <span className={styles.pendingRole}>{formatRole(invite.role)}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className={styles.revokeButton}
                  disabled={revokingId === invite.id}
                  onClick={() => void revokeInvite(invite.id)}
                >
                  {revokingId === invite.id ? "Revocando…" : "Revocar"}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className={styles.hint}>
        Solo <strong>org:admin</strong> puede invitar o quitar miembros. Usa <strong>Quitar</strong> para
        sacar a alguien del workspace y volver a invitarlo. <strong>Revocar</strong> aplica solo a
        invitaciones pendientes.
      </p>
    </div>
  );
}
