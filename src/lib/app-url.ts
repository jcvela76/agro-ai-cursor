/**
 * Canonical app origin for Clerk invitation redirects and absolute links.
 * Prefer NEXT_PUBLIC_APP_URL (set per Vercel env: stg.geoagro.ai / geoagro.ai).
 */
export function appBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

export function orgInvitationRedirectUrl(): string {
  return `${appBaseUrl()}/app`;
}
