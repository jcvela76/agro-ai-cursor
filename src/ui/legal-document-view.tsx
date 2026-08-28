import Link from "next/link";
import type { LegalDocument } from "@/content/legal/types";
import { LEGAL_CONTACT_EMAIL, LEGAL_JURISDICTION, LEGAL_LAST_UPDATED } from "@/content/legal/types";
import styles from "@/app/legal/legal.module.css";

const ALL_LINKS = [
  { slug: "terms", label: "Términos" },
  { slug: "privacy", label: "Privacidad" },
  { slug: "refunds", label: "Reembolsos" },
  { slug: "subscription", label: "Suscripción" },
] as const;

export function LegalDocumentView({ document }: { document: LegalDocument }) {
  return (
    <main className={styles.page}>
      <p className={styles.eyebrow}>Legal</p>
      <h1 className={styles.title}>{document.title}</h1>
      <p className={styles.lead}>{document.description}</p>
      <p className={styles.meta}>
        Última actualización: {LEGAL_LAST_UPDATED} · {LEGAL_JURISDICTION} ·{" "}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>
      </p>
      <aside className={styles.notice} role="note">
        Texto orientativo para operación del producto. No sustituye asesoría legal
        profesional. Revise con su abogado antes de habilitar cobro live a clientes en Perú.
      </aside>

      {document.sections.map((section) => (
        <section key={section.id} id={section.id} className={styles.section}>
          <h2 className={styles.sectionTitle}>{section.heading}</h2>
          {section.paragraphs?.map((paragraph) => (
            <p key={paragraph} className={styles.paragraph}>
              {paragraph}
            </p>
          ))}
          {section.bullets ? (
            <ul className={styles.list}>
              {section.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}

      <nav className={styles.legalNav} aria-label="Otros documentos legales">
        {ALL_LINKS.map((link) => (
          <Link
            key={link.slug}
            className={link.slug === document.slug ? styles.legalNavActive : styles.legalNavLink}
            href={`/legal/${link.slug}`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <Link className={styles.back} href="/">
        ← Inicio
      </Link>
    </main>
  );
}
