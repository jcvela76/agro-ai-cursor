"use client";

import { SubscriptionDetailsButton } from "@clerk/nextjs/experimental";
import { useOrganization } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { isBillingSandboxHost } from "@/domain/billing/plan-display";
import { BillingWorkspaceNav } from "@/ui/billing-workspace-nav";
import { Button } from "@/ui/button";
import styles from "./billing-panel.module.css";

export function BillingCancelPanel() {
  const { organization } = useOrganization();
  const [sandbox, setSandbox] = useState(false);

  useEffect(() => {
    setSandbox(isBillingSandboxHost(window.location.hostname));
  }, []);

  return (
    <div className={styles.shell}>
      <BillingWorkspaceNav active="cancel" orgName={organization?.name} />

      <div className={styles.page}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Facturación</p>
            <h1 className={styles.title}>Cancelar suscripción</h1>
            <p className={styles.muted}>
              La cancelación se completa en el portal de Clerk. No procesamos pagos ni cancelaciones
              en esta pantalla.
            </p>
          </div>
        </header>

        {sandbox ? (
          <div className={styles.sandboxBanner} role="status">
            <strong>Sandbox</strong>
            <span>stg.geoagro.ai — entorno de prueba Clerk Billing.</span>
          </div>
        ) : null}

        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Antes de cancelar</h2>
          <ul className={styles.bulletList}>
            <li>
              Perderás acceso a <strong>Weather Intelligence Plus</strong> y funciones asociadas al
              plan de pago.
            </li>
            <li>
              Conservarás <strong>Weather base</strong> incluido en el plan gratuito de la
              organización.
            </li>
            <li>
              Si estás en periodo de prueba, el acceso puede terminar según las reglas de Clerk
              (no mostramos fechas aquí).
            </li>
          </ul>
          <div className={styles.portalActions}>
            <SubscriptionDetailsButton for="organization">
              <Button type="button" variant="primary">
                Abrir portal de cancelación (Clerk)
              </Button>
            </SubscriptionDetailsButton>
            <Link className={styles.keepPlan} href="/app/billing">
              Mantener plan
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
