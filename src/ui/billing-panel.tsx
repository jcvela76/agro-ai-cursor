"use client";

import { PricingTable } from "@clerk/nextjs";
import { SubscriptionDetailsButton } from "@clerk/nextjs/experimental";
import { useOrganization } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import { isBillingSandboxHost, planDisplayLabel, planDisplayPrice } from "@/domain/billing/plan-display";
import { LEGAL_NAV_LINKS } from "@/content/legal/types";
import type { WorkspaceSettings } from "@/domain/workspace/types";
import { BillingWorkspaceNav } from "@/ui/billing-workspace-nav";
import { Button } from "@/ui/button";
import styles from "./billing-panel.module.css";

export function BillingPanel() {
  const { organization } = useOrganization();
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [sandbox, setSandbox] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSandbox(isBillingSandboxHost(window.location.hostname));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/workspace/settings");
        const json = (await res.json()) as {
          status: string;
          data?: WorkspaceSettings;
          message?: string;
        };
        if (!res.ok || json.status !== "OK" || !json.data) {
          if (!cancelled) {
            setError(json.message ?? "No se pudieron cargar los datos de facturación");
          }
          return;
        }
        if (!cancelled) {
          setSettings(json.data);
        }
      } catch {
        if (!cancelled) {
          setError("No se pudieron cargar los datos de facturación");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const planSlug = settings?.billingPlanSlug ?? null;
  const planLabel = planDisplayLabel(planSlug);
  const planPrice = planDisplayPrice(planSlug);

  return (
    <div className={styles.shell}>
      <BillingWorkspaceNav active="billing" orgName={organization?.name} />

      <div className={styles.page}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Facturación</p>
            <h1 className={styles.title}>Suscripción</h1>
            <p className={styles.muted}>
              Planes y pagos gestionados por Clerk Billing. Fechas de renovación y facturas en el
              portal de Clerk.
            </p>
          </div>
        </header>

        {sandbox ? (
          <div className={styles.sandboxBanner} role="status">
            <strong>Sandbox</strong>
            <span>
              Cobros de prueba en Development / stg.geoagro.ai. Production requiere Stripe live
              y revisión legal — ver{" "}
              <Link href="/legal/subscription">Términos de suscripción</Link> y{" "}
              <Link href="/legal/refunds">Reembolsos</Link>.
            </span>
          </div>
        ) : null}

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Plan actual</h2>
            {!settings && !error ? <span className={styles.muted}>Cargando…</span> : null}
          </div>
          {settings ? (
            <>
              <p className={styles.planName}>{planLabel}</p>
              {planPrice ? <p className={styles.planPrice}>{planPrice}</p> : null}
              <p className={styles.planSlug}>
                Slug: <code>{planSlug ?? "free"}</code>
              </p>
              <p className={styles.muted}>
                Renovación, método de pago y recibos en el portal de Clerk (no mostramos fechas
                aquí).
              </p>
              <div className={styles.portalActions}>
                <SubscriptionDetailsButton for="organization">
                  <Button type="button" variant="primary">
                    Administrar facturación
                  </Button>
                </SubscriptionDetailsButton>
                <Link className={styles.textLink} href="/app/billing/cancel">
                  Cancelar plan →
                </Link>
              </div>
            </>
          ) : null}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Cambiar plan</h2>
          <p className={styles.muted}>
            Tabla oficial de Clerk — checkout y upgrades sin UI de pago custom.
          </p>
          <div className={styles.clerkEmbed}>
            <PricingTable for="organization" newSubscriptionRedirectUrl="/app/billing" />
          </div>
        </section>

        <footer className={styles.footer}>
          <nav className={styles.legalNav} aria-label="Legal">
            {LEGAL_NAV_LINKS.map((link) => (
              <Link key={link.href} className={styles.legalLink} href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
          {sandbox ? (
            <p className={styles.footerNote}>
              Entorno de prueba: los cargos no son reales hasta activar billing live en Production.
            </p>
          ) : null}
        </footer>
      </div>
    </div>
  );
}
