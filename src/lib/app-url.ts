const STG_CANONICAL = "https://stg.geoagro.ai";
const PROD_CANONICAL = "https://geoagro.ai";

const KNOWN_HOSTS: Record<string, string> = {
  "stg.geoagro.ai": STG_CANONICAL,
  "geoagro.ai": PROD_CANONICAL,
  "www.geoagro.ai": PROD_CANONICAL,
};

function normalizeOrigin(url: string): string {
  return url.replace(/\/$/, "");
}

function hostFromRequest(request?: Request): string | null {
  if (!request) {
    return null;
  }
  const raw = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!raw) {
    return null;
  }
  return raw.split(",")[0]?.trim().toLowerCase().split(":")[0] ?? null;
}

function canonicalFromHost(host: string | null): string | null {
  if (!host) {
    return null;
  }
  return KNOWN_HOSTS[host] ?? null;
}

function canonicalFromGitBranch(): string | null {
  const ref = process.env.VERCEL_GIT_COMMIT_REF?.trim();
  if (ref === "stg") {
    return STG_CANONICAL;
  }
  if (ref === "main") {
    return PROD_CANONICAL;
  }
  return null;
}

export type AppBaseUrlOptions = {
  request?: Request;
};

/**
 * Canonical app origin for Clerk invitation redirects and absolute links.
 * Resolution order: NEXT_PUBLIC_APP_URL → request host → git branch → VERCEL_URL.
 */
export function appBaseUrl(options?: AppBaseUrlOptions): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return normalizeOrigin(configured);
  }

  const fromHost = canonicalFromHost(hostFromRequest(options?.request));
  if (fromHost) {
    return fromHost;
  }

  const fromBranch = canonicalFromGitBranch();
  if (fromBranch) {
    return fromBranch;
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return normalizeOrigin(`https://${vercel}`);
  }

  return "http://localhost:3000";
}

export function orgInvitationRedirectUrl(options?: AppBaseUrlOptions): string {
  return `${appBaseUrl(options)}/accept-invitation`;
}
