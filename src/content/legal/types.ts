export type LegalBlock =
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] };

export type LegalSection = {
  id: string;
  heading: string;
  blocks: LegalBlock[];
};

export type LegalDocument = {
  slug: string;
  title: string;
  description: string;
  sections: LegalSection[];
};

export const LEGAL_LAST_UPDATED = "2026-08-28";
export const LEGAL_CONTACT_EMAIL = "hola@geoagro.ai";
export const LEGAL_OPERATOR = "Agro AI";
export const LEGAL_JURISDICTION = "República del Perú";

/** Placeholders until razón social / RUC are confirmed with counsel. */
export const LEGAL_OPERATOR_LEGAL_NAME = "[Razón social por definir]";
export const LEGAL_OPERATOR_RUC = "[RUC por definir]";
export const LEGAL_OPERATOR_ADDRESS = "Lima, Perú";

export const LEGAL_NAV_LINKS = [
  { slug: "terms", label: "Términos", href: "/legal/terms" },
  { slug: "privacy", label: "Privacidad", href: "/legal/privacy" },
  { slug: "refunds", label: "Reembolsos", href: "/legal/refunds" },
  { slug: "subscription", label: "Suscripción", href: "/legal/subscription" },
] as const;
