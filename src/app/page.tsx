import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import styles from "./landing.module.css";

export default async function Home() {
  const { userId } = await auth();
  if (userId) {
    redirect("/app");
  }

  return (
    <main className={styles.page}>
      <div className={styles.atmosphere} aria-hidden />
      <header className={styles.top}>
        <p className={styles.brand}>Agro AI</p>
        <nav className={styles.nav}>
          <Link className={styles.ghost} href="/sign-in">
            Entrar
          </Link>
          <Link className={styles.cta} href="/sign-up">
            Crear cuenta
          </Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <h1 className={styles.headline}>Clima confiable para tu parcela exacta</h1>
        <p className={styles.support}>
          Observación y pronóstico con fuente, frescura y alcance espacial explícitos. Sin inventar
          datos cuando la evidencia falta.
        </p>
        <div className={styles.actions}>
          <Link className={styles.cta} href="/sign-up">
            Empezar
          </Link>
          <Link className={styles.ghost} href="/sign-in">
            Ya tengo workspace
          </Link>
        </div>
      </section>

      <section className={styles.proof}>
        <h2>Weather base</h2>
        <ul>
          <li>Parcela autorizada del workspace</li>
          <li>Observación ordinaria con evidencia completa</li>
          <li>Pronóstico ordinario con horizonte y validez</li>
          <li>Estados cerrados: no disponible, obsoleto, error</li>
        </ul>
        <p className={styles.next}>
          Próximo: Intelligence Plus · Traceability · Agronomic Review
        </p>
      </section>
    </main>
  );
}
