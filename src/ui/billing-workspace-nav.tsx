"use client";

import Link from "next/link";
import styles from "./billing-workspace-nav.module.css";

export type BillingWorkspaceSection = "admin" | "billing" | "cancel";

type Props = {
  active: BillingWorkspaceSection;
  orgName?: string | null;
};

const LINKS: { id: BillingWorkspaceSection; href: string; label: string }[] = [
  { id: "admin", href: "/app/admin", label: "Admin" },
  { id: "billing", href: "/app/billing", label: "Suscripción" },
  { id: "cancel", href: "/app/billing/cancel", label: "Cancelar" },
];

export function BillingWorkspaceNav({ active, orgName }: Props) {
  return (
    <nav className={styles.bar} aria-label="Workspace billing">
      <div className={styles.inner}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>Agro</span>
          {orgName ? <span className={styles.orgName}>{orgName}</span> : null}
        </div>
        <ul className={styles.links}>
          {LINKS.map((link) => (
            <li key={link.id}>
              <Link
                className={link.id === active ? styles.linkActive : styles.link}
                href={link.href}
                aria-current={link.id === active ? "page" : undefined}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link className={styles.mapLink} href="/app">
          Mapa
        </Link>
      </div>
    </nav>
  );
}
