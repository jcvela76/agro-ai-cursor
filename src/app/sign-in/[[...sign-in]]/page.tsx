import { SignIn } from "@clerk/nextjs";
import { LegalFooterLinks } from "@/ui/legal-footer-links";
import styles from "../../auth-legal.module.css";

const AFTER_AUTH = "/app";

export default function SignInPage() {
  return (
    <main className={styles.main}>
      <SignIn forceRedirectUrl={AFTER_AUTH} fallbackRedirectUrl={AFTER_AUTH} />
      <LegalFooterLinks />
    </main>
  );
}
