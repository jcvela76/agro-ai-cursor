import { LEGAL_CONTACT_EMAIL } from "@/content/legal/types";

/**
 * Landing pricing — oferta comercial Free + Enterprise (ADR-060).
 *
 * Mid-tiers Clerk (`weather_plus` / `operations` / `full`) no se venden en LP;
 * siguen en billing para piloto/prueba interna. Ver `docs/ops/billing.md`.
 *
 * Free → `free_org` (weather). Enterprise → cotización post-auditoría
 * (`docs/ops/dedicated-plan-audit.md`).
 */
export const LANDING_PRICING_SAAS_SOURCE = {
  /** Referencia interna / piloto; no se muestra como oferta LP. */
  weatherPlusUsd: 29,
  operationsUsd: 79,
  fullUsd: 99,
  currency: "USD",
  billingDocs: "/legal/subscription",
} as const;

export type LandingPricingTier = {
  tier: string;
  desc: string;
  price: string;
  period: string;
  features: readonly string[];
  highlight: boolean;
  cta: string;
  ctaHref?: string;
  disclaimer?: string;
};

const ENTERPRISE_MAIL_SUBJECT = "Enterprise — auditoría tecnológica Agro AI";

export const LANDING_PRICING: readonly LandingPricingTier[] = [
  {
    tier: "Free",
    desc: "Para probar clima real en tu parcela",
    price: "Gratis",
    period: "Weather Intelligence base",
    features: [
      "Datos climáticos por parcela (fuente citada)",
      "Pronóstico a varios días",
      "Hasta 2 parcelas · máx. 25 ha cada una",
      "Hasta 2 miembros en el workspace",
    ],
    highlight: true,
    cta: "Solicitar acceso al piloto",
  },
  {
    tier: "Enterprise",
    desc: "Software B2B dedicado para tu operación",
    price: "A cotizar",
    period: "tras auditoría tecnológica",
    features: [
      "Auditoría tecnológica (piloto: sin fee, sujetos a cupo)",
      "Integraciones a medida (IoT, ERP, APIs)",
      "Flujos e informes personalizados por contrato",
      "Workspace alineado a tus fuentes y compliance",
    ],
    highlight: false,
    cta: "Agendar auditoría",
    ctaHref: `mailto:${LEGAL_CONTACT_EMAIL}?subject=${encodeURIComponent(ENTERPRISE_MAIL_SUBJECT)}`,
    disclaimer:
      "No disponible en checkout web. Free demuestra el valor del clima; Enterprise es el camino B2B. En piloto la auditoría puede ser sin cargo si hay cupo y fit; la implementación se cotiza aparte.",
  },
] as const;
