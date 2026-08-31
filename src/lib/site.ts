/** Canonical public site config for SEO / absolute URLs. */
export const SITE_URL = "https://geoagro.ai";

export const SITE_NAME = "Agro AI";

export const SITE_TITLE =
  "Agro AI — clima e índices por parcela en Perú | Lista de espera";

export const SITE_DESCRIPTION =
  "Datos climáticos georreferenciados por parcela, con fuente y frescura explícitas. Fuentes Open-Meteo y NASA POWER. Lista de espera para el piloto en Perú.";

/** Production Vercel deployments only; preview/stg/local stay noindex. */
export function isSearchIndexable(): boolean {
  return process.env.VERCEL_ENV === "production";
}
