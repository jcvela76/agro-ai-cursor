import Link from "next/link";
import { LEGAL_CONTACT_EMAIL, LEGAL_NAV_LINKS } from "@/content/legal/types";
import styles from "./legal-footer-links.module.css";

type Props = {
  showContact?: boolean;
  className?: string;
};

export function LegalFooterLinks({ showContact = false, className }: Props) {
  return (
    <nav className={`${styles.nav} ${className ?? ""}`} aria-label="Documentos legales">
      {showContact ? (
        <a className={styles.link} href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
          {LEGAL_CONTACT_EMAIL}
        </a>
      ) : null}
      {LEGAL_NAV_LINKS.map((link) => (
        <Link key={link.slug} className={styles.link} href={link.href}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
