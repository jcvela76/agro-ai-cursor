/** Client helpers for pilot telemetry (fire-and-forget). */

export async function trackPilotEvent(
  eventName: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  try {
    await fetch("/api/pilot/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventName, payload }),
      keepalive: true,
    });
  } catch {
    // ignore — telemetry must not break UX
  }
}

export async function reportPilotError(input: {
  source: string;
  message: string;
  stack?: string;
  route?: string;
  severity?: "info" | "warn" | "error";
}): Promise<void> {
  try {
    await fetch("/api/pilot/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...input,
        route: input.route ?? (typeof window !== "undefined" ? window.location.pathname : undefined),
      }),
      keepalive: true,
    });
  } catch {
    // ignore
  }
}
