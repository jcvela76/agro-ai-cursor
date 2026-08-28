import Link from "next/link";
import type { LegalDocument } from "@/content/legal/types";
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_JURISDICTION,
  LEGAL_LAST_UPDATED,
  LEGAL_NAV_LINKS,
} from "@/content/legal/types";
import styles from "@/app/legal/legal.module.css";

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
          {section.blocks.map((block, blockIndex) => {
            if (block.type === "paragraph") {
              return (
                <p key={`${section.id}-p-${blockIndex}`} className={styles.paragraph}>
                  {block.text}
                </p>
              );
            }
            return (
              <ul key={`${section.id}-b-${blockIndex}`} className={styles.list}>
                {block.items.map((item, itemIndex) => (
                  <li key={`${section.id}-b-${blockIndex}-i-${itemIndex}`}>{item}</li>
                ))}
              </ul>
            );
          })}
        </section>
      ))}

      <nav className={styles.legalNav} aria-label="Otros documentos legales">
        {LEGAL_NAV_LINKS.map((link) => (
          <Link
            key={link.slug}
            className={link.slug === document.slug ? styles.legalNavActive : styles.legalNavLink}
            href={link.href}
            aria-current={link.slug === document.slug ? "page" : undefined}
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
