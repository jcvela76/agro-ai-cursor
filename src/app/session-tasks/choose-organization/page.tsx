import { TaskChooseOrganization } from "@clerk/nextjs";
import { LegalFooterLinks } from "@/ui/legal-footer-links";
import { FreeWorkspaceIntro } from "@/ui/free-workspace-intro";
import styles from "../../auth-legal.module.css";

/**
 * Camino principal post sign-up/sign-in (Personal Accounts off).
 * ClerkProvider.taskUrls → aquí; webhook aplica Free (ADR-061).
 */
export default function ChooseOrganizationTaskPage() {
  return (
    <main className={styles.main}>
      <FreeWorkspaceIntro />
      <TaskChooseOrganization redirectUrlComplete="/app" />
      <LegalFooterLinks />
    </main>
  );
}
