import { SignIn } from "@clerk/nextjs";
import { LegalFooterLinks } from "@/ui/legal-footer-links";
import styles from "../../auth-legal.module.css";

/** Prefer fallback so Clerk session tasks (choose-organization) are not forced past. */
const AFTER_AUTH = "/app";

export default function SignInPage() {
  return (
    <main className={styles.main}>
      <SignIn fallbackRedirectUrl={AFTER_AUTH} />
      <LegalFooterLinks />
    </main>
  );
}
