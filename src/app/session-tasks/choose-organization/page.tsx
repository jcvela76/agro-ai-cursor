import { TaskChooseOrganization } from "@clerk/nextjs";
import { LegalFooterLinks } from "@/ui/legal-footer-links";
import styles from "../../auth-legal.module.css";

/**
 * Completes Clerk session task `choose-organization` (Personal Accounts off).
 * Wired via ClerkProvider taskUrls — ADR-061 Free self-serve.
 */
export default function ChooseOrganizationTaskPage() {
  return (
    <main className={styles.main}>
      <TaskChooseOrganization redirectUrlComplete="/app" />
      <LegalFooterLinks />
    </main>
  );
}
