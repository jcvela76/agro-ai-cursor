import Link from "next/link";
import { ENTERPRISE_AUDIT_MAILTO } from "@/content/landing/pricing";
import type { PlanFeatureUpsellKey } from "@/domain/auth/workspace-capabilities";
import { StateBanner } from "@/ui/state-banner";
import styles from "./plan-feature-upsell.module.css";

const COPY: Record<
  PlanFeatureUpsellKey,
  { title: string; detail: string }
> = {
  spectral: {
    title: "Espectral no está en Free",
    detail:
      "Índices de vegetación e overlays por parcela forman parte de Enterprise (o de un piloto con Plus).",
  },
  agent: {
    title: "Agente no está en Free",
    detail:
      "El Agro Agent conversacional requiere un workspace con Intelligence Plus / Enterprise.",
  },
  profile: {
    title: "Perfil agronómico no está en Free",
    detail: "Cultivo, riego y siembra por parcela se activan con Plus / Enterprise.",
  },
  field: {
    title: "Bitácora de campo no está en Free",
    detail: "Notas de inspección por parcela requieren Plus / Enterprise.",
  },
  trace: {
    title: "Trazabilidad no está en Free",
    detail: "Lotes y evidencia EUDR piloto se habilitan en Enterprise u operaciones piloto.",
  },
  review: {
    title: "Revisión agronómica no está en Free",
    detail: "Decisiones humanas append-only forman parte de Enterprise / piloto full.",
  },
  reports: {
    title: "Informes no están en Free",
    detail: "HTML/PDF con evidencia completa requieren Plus / Enterprise.",
  },
  briefings: {
    title: "Briefing diario no está en Free",
    detail: "El resumen diario por parcela requiere Plus / Enterprise.",
  },
};

export function PlanFeatureUpsell({
  feature,
  isAdmin,
}: {
  feature: PlanFeatureUpsellKey;
  isAdmin: boolean;
}) {
  const copy = COPY[feature];
  return (
    <div className={styles.root}>
      <StateBanner title={copy.title} detail={copy.detail} tone="unavailable" />
      <div className={styles.actions}>
        <a className={styles.primary} href={ENTERPRISE_AUDIT_MAILTO}>
          Agendar auditoría Enterprise →
        </a>
        {isAdmin ? (
          <Link className={styles.secondary} href="/app/admin">
            Activar en Admin (piloto) →
          </Link>
        ) : (
          <p className={styles.hint}>
            Si tu equipo ya opera un piloto, pedí a un admin que active el entitlement.
          </p>
        )}
      </div>
    </div>
  );
}
