import { SignIn } from "@clerk/nextjs";
import { LegalFooterLinks } from "@/ui/legal-footer-links";
import styles from "../../auth-legal.module.css";

export default function SignInPage() {
  return (
    <main className={styles.main}>
      <SignIn />
      <LegalFooterLinks />
    </main>
  );
}
