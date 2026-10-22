/** Canonical public site config for SEO / absolute URLs. */
export const SITE_URL = "https://geoagro.ai";

export const SITE_NAME = "Agro AI";

export const SITE_TITLE = "Agro AI — clima por parcela en Perú · Free";

export const SITE_DESCRIPTION =
  "Clima georreferenciado por parcela, con fuente y frescura explícitas (Open-Meteo y NASA POWER). Empieza Free; Enterprise para índices y operación.";

/** Production Vercel deployments only; preview/stg/local stay noindex. */
export function isSearchIndexable(): boolean {
  return process.env.VERCEL_ENV === "production";
}
