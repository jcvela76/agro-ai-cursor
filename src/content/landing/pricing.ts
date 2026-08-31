import { LEGAL_CONTACT_EMAIL } from "@/content/legal/types";

/**
 * Landing pricing cards — orientativos hasta checkout live.
 *
 * Fuente de verdad (SaaS self-serve):
 * - `docs/ops/billing.md` · `docs/ops/clerk-billing-plans.json`
 * - `src/domain/billing/plan-display.ts` (USD/mes)
 * - `/legal/subscription` (counsel 2026-08-29)
 *
 * Mapeo LP → slug Clerk:
 * - Básico → free_org (gratis, weather)
 * - Profesional → weather_plus (USD 29/mes)
 * - Empresa → operations (USD 79/mes) o full (USD 99/mes, alias)
 * - Dedicado → no autopserve; cotización tras auditoría tecnológica
 *   (draft interno: docs/ops/dedicated-plan-audit.md)
 */
export const LANDING_PRICING_SAAS_SOURCE = {
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

const DEDICATED_MAIL_SUBJECT = "Plan Dedicado — auditoría tecnológica";

export const LANDING_PRICING: readonly LandingPricingTier[] = [
  {
    tier: "Básico",
    desc: "Para productores individuales",
    price: "Gratis",
    period: "Weather Intelligence base",
    features: [
      "Datos climáticos por parcela",
      "Pronóstico a varios días",
      "Observación y pronóstico con fuente citada",
      "Parcelas limitadas",
    ],
    highlight: false,
    cta: "Solicitar acceso al piloto",
  },
  {
    tier: "Profesional",
    desc: "Para técnicos y consultores",
    price: `USD ${LANDING_PRICING_SAAS_SOURCE.weatherPlusUsd}`,
    period: "/mes al lanzamiento · sin costo en piloto",
    features: [
      "Todo en Básico",
      "Weather Intelligence Plus",
      "Hasta 5 miembros (plan Profesional)",
      "Soporte por correo durante piloto",
    ],
    highlight: true,
    cta: "Solicitar acceso al piloto →",
  },
  {
    tier: "Empresa",
    desc: "Cooperativas y exportadores",
    price: `Desde USD ${LANDING_PRICING_SAAS_SOURCE.operationsUsd}`,
    period: `/mes · Operations Intelligence (hasta USD ${LANDING_PRICING_SAAS_SOURCE.fullUsd} Full)`,
    features: [
      "Trazabilidad y Revisión Agronómica",
      "Hasta 15–25 miembros según plan",
      "Soporte y onboarding (sin SLA salvo contrato)",
      "Capacitación sujeta a disponibilidad",
    ],
    highlight: false,
    cta: "Contactar",
    ctaHref: `mailto:${LEGAL_CONTACT_EMAIL}?subject=${encodeURIComponent("Plan Empresa — Agro AI")}`,
  },
  {
    tier: "Dedicado",
    desc: "IoT, ERP e integraciones a medida",
    price: "A cotizar",
    period: "tras auditoría tecnológica",
    features: [
      "Auditoría tecnológica en piloto (sin fee, sujetos a cupo)",
      "Workspace adaptable a sus fuentes (IoT, ERP, APIs)",
      "Flujos e informes personalizados por contrato",
      "Operations Intelligence o superior como base",
    ],
    highlight: false,
    cta: "Agendar auditoría",
    ctaHref: `mailto:${LEGAL_CONTACT_EMAIL}?subject=${encodeURIComponent(DEDICATED_MAIL_SUBJECT)}`,
    disclaimer:
      "No disponible en checkout web. En fase piloto la auditoría puede ser sin cargo si hay cupo y fit; implementación Dedicado se cotiza aparte.",
  },
] as const;
