import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { createAccessResolver, getOrgReport } from "@/infrastructure/container";
import styles from "./page.module.css";

export default async function ReportPreviewPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const { userId, orgId } = await auth();
  const accessResolver = createAccessResolver();
  const authority = await accessResolver.resolve(userId, orgId ?? null);

  if (!authority) {
    return (
      <main className={styles.page}>
        <p>Inicia sesión para ver este informe.</p>
      </main>
    );
  }

  const result = await getOrgReport.execute(authority.orgId, reportId);
  if (!result.ok) {
    return (
      <main className={styles.page}>
        <p>Informe no encontrado.</p>
        <Link href="/app">Volver a la app</Link>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.toolbar}>
        <div>
          <h1 className={styles.title}>{result.report.title}</h1>
          <p className={styles.meta}>
            {result.report.reportType} · {new Date(result.report.createdAt).toLocaleString("es-PE")}
          </p>
        </div>
        <div className={styles.toolbarActions}>
          <a className={styles.viewPdf} href={`/api/reports/${reportId}/pdf?inline=1`} target="_blank" rel="noopener noreferrer">
            Ver PDF
          </a>
          <a className={styles.download} href={`/api/reports/${reportId}/pdf`}>
            Descargar PDF
          </a>
        </div>
      </header>
      <iframe
        className={styles.frame}
        title={result.report.title}
        srcDoc={result.report.htmlContent}
      />
    </main>
  );
}
