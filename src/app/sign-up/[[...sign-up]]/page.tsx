import { SignUp } from "@clerk/nextjs";
import { LegalFooterLinks } from "@/ui/legal-footer-links";
import styles from "../../auth-legal.module.css";

/** Prefer fallback so Clerk session tasks (choose-organization) are not forced past. */
const AFTER_AUTH = "/app";

export default function SignUpPage() {
  return (
    <main className={styles.main}>
      <SignUp fallbackRedirectUrl={AFTER_AUTH} />
      <LegalFooterLinks />
    </main>
  );
}
