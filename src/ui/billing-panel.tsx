"use client";

import { PricingTable } from "@clerk/nextjs";
import Link from "next/link";
import styles from "./billing-panel.module.css";

export function BillingPanel() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Workspace</p>
          <h1 className={styles.title}>Suscripción</h1>
          <p className={styles.muted}>
            Clerk Billing (sandbox en Development / stg). Cobro live en Production requiere
            checklist legal — ver docs/ops/billing.md.
          </p>
        </div>
        <Link className={styles.back} href="/app/admin">
          ← Admin
        </Link>
      </header>

      <section className={styles.section}>
        <PricingTable for="organization" newSubscriptionRedirectUrl="/app/admin" />
      </section>
    </div>
  );
}
