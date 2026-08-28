export type LegalSection = {
  id: string;
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
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
