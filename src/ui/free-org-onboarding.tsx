"use client";

import { CreateOrganization } from "@clerk/nextjs";
import { LegalFooterLinks } from "@/ui/legal-footer-links";
import { FreeWorkspaceIntro } from "@/ui/free-workspace-intro";
import styles from "@/app/auth-legal.module.css";

/**
 * Fallback: sesión active sin orgId (la task Clerk ya no aplica).
 * Camino normal: `/session-tasks/choose-organization`.
 */
export function FreeOrgOnboarding() {
  return (
    <main className={styles.main}>
      <FreeWorkspaceIntro />
      <CreateOrganization afterCreateOrganizationUrl="/app" />
      <LegalFooterLinks />
    </main>
  );
}
