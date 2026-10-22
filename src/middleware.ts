import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { hasClerkInvitationParams } from "@/lib/clerk-invitation-ticket";

const isPublicRoute = createRouteMatcher([
  "/",
  "/legal(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/f26",
  "/session-tasks(.*)",
  "/accept-invitation(.*)",
  "/maplibre(.*)",
  "/api/waitlist",
  "/api/landing/spectral-overlay",
  "/api/debug/sentry-test",
  "/api/webhooks(.*)",
  "/robots.txt",
  "/sitemap.xml",
  "/icon",
  "/apple-icon",
  "/opengraph-image",
  "/twitter-image",
]);

export default clerkMiddleware(async (auth, req) => {
  // Org invites append __clerk_* to redirectUrl; /app cannot consume them.
  if (req.nextUrl.pathname === "/app" && hasClerkInvitationParams(req.nextUrl.searchParams)) {
    const url = req.nextUrl.clone();
    url.pathname = "/accept-invitation";
    return NextResponse.redirect(url);
  }

  const { userId, sessionStatus } = await auth({ treatPendingAsSignedOut: false });

  // Pending session tasks (e.g. choose-organization) must finish before /app.
  if (
    sessionStatus === "pending" &&
    (req.nextUrl.pathname === "/app" || req.nextUrl.pathname.startsWith("/app/"))
  ) {
    return NextResponse.redirect(new URL("/session-tasks/choose-organization", req.url));
  }

  // Keep `/` statically cacheable: redirect signed-in users here, not in page.tsx.
  if (req.nextUrl.pathname === "/") {
    if (userId && sessionStatus === "active") {
      return NextResponse.redirect(new URL("/app", req.url));
    }
    if (userId && sessionStatus === "pending") {
      return NextResponse.redirect(new URL("/session-tasks/choose-organization", req.url));
    }
  }

  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Include .mjs so MapLibre worker is matched, then allowlisted as public above.
    // Also skip common static extensions from auth entirely.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|mjs|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
