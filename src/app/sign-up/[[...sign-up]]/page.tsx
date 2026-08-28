import { SignUp } from "@clerk/nextjs";
import { LegalFooterLinks } from "@/ui/legal-footer-links";
import styles from "../../auth-legal.module.css";

export default function SignUpPage() {
  return (
    <main className={styles.main}>
      <SignUp />
      <LegalFooterLinks />
    </main>
  );
}
