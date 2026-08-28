export type FetchFn = typeof fetch;

export const DEFAULT_CDSE_TOKEN_URL =
  "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";

interface CachedToken {
  accessToken: string;
  expiresAtMs: number;
}

/**
 * OAuth2 client-credentials token for CDSE Sentinel Hub APIs.
 * Caches in-memory until near expiry (60s skew).
 */
export class CdseTokenProvider {
  private cache: CachedToken | null = null;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly fetchFn: FetchFn = fetch,
    private readonly tokenUrl = process.env.CDSE_TOKEN_URL ?? DEFAULT_CDSE_TOKEN_URL,
  ) {}

  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAtMs > now + 60_000) {
      return this.cache.accessToken;
    }

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const response = await this.fetchFn(this.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!response.ok) {
      throw new Error(`CDSE token request failed (${response.status})`);
    }

    const payload = (await response.json()) as {
      access_token?: string;
      expires_in?: number;
    };

    if (!payload.access_token || typeof payload.expires_in !== "number") {
      throw new Error("CDSE token response missing access_token");
    }

    this.cache = {
      accessToken: payload.access_token,
      expiresAtMs: now + payload.expires_in * 1000,
    };
    return this.cache.accessToken;
  }

  clearCache(): void {
    this.cache = null;
  }
}
