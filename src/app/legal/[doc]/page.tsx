import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "../legal.module.css";

const DOCS: Record<string, { title: string; description: string }> = {
  terms: {
    title: "Términos de servicio",
    description: "Condiciones generales de uso de Agro AI.",
  },
  privacy: {
    title: "Política de privacidad",
    description: "Cómo tratamos datos personales y de workspace.",
  },
  refunds: {
    title: "Política de reembolsos",
    description: "Criterios de reembolso para suscripciones.",
  },
  subscription: {
    title: "Términos de suscripción",
    description: "Condiciones específicas de planes y facturación.",
  },
};

type Props = {
  params: Promise<{ doc: string }>;
};

export function generateStaticParams() {
  return Object.keys(DOCS).map((doc) => ({ doc }));
}

export default async function LegalDocPage({ params }: Props) {
  const { doc } = await params;
  const entry = DOCS[doc];
  if (!entry) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <p className={styles.eyebrow}>Legal</p>
      <h1 className={styles.title}>{entry.title}</h1>
      <p className={styles.lead}>{entry.description}</p>
      <p className={styles.stub}>
        Documento en preparación para billing live en Production. Mientras tanto, los pagos en stg
        usan Clerk Billing sandbox.
      </p>
      <Link className={styles.back} href="/">
        ← Inicio
      </Link>
    </main>
  );
}
