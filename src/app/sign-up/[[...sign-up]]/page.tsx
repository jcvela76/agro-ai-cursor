import { SignUp } from "@clerk/nextjs";
import { LegalFooterLinks } from "@/ui/legal-footer-links";
import styles from "../../auth-legal.module.css";

const AFTER_AUTH = "/app";

export default function SignUpPage() {
  return (
    <main className={styles.main}>
      <SignUp forceRedirectUrl={AFTER_AUTH} fallbackRedirectUrl={AFTER_AUTH} />
      <LegalFooterLinks />
    </main>
  );
}
