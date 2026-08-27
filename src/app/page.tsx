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

      <section className={`${styles.hero} ${styles.reveal}`}>
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

      <section className={`${styles.section} ${styles.revealDelay}`}>
        <h2 className={styles.sectionTitle}>El problema</h2>
        <p className={styles.sectionBody}>
          El clima genérico de la ciudad no describe tu lote. Falta saber de qué fuente viene el dato,
          cuándo se observó, hasta cuándo vale el pronóstico y si sigue fresco — antes de decidir en
          campo.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Weather base</h2>
        <p className={styles.sectionBody}>
          Primer producto de Agro AI: contexto climático parcel-aware, determinístico y auditable.
        </p>
        <ul className={styles.list}>
          <li>Parcela autorizada del workspace, dibujada en el mapa</li>
          <li>Observación ordinaria con evidencia completa</li>
          <li>Pronóstico ordinario con horizonte y validez</li>
          <li>Estados cerrados: no disponible, obsoleto, error — nunca fabricados</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Plataforma multiproducto</h2>
        <p className={styles.sectionBody}>
          Weather es el inicio. El mismo workspace activa productos con permisos scoped — sin mezclar
          evidencia ni autoridad.
        </p>
        <div className={styles.productGrid}>
          <article className={styles.product}>
            <h3>Intelligence Plus</h3>
            <p>Consultas conversacionales parcel-aware con fuentes e incertidumbre explícitas.</p>
            <span className={styles.tag}>Add-on · próximo</span>
          </article>
          <article className={styles.product}>
            <h3>Traceability</h3>
            <p>Piloto coffee / EUDR: cadena de lotes y evidencia de origen.</p>
            <span className={styles.tag}>Discovery</span>
          </article>
          <article className={styles.product}>
            <h3>Agronomic Review</h3>
            <p>Decisiones humanas append-only sobre la evidencia acumulada.</p>
            <span className={styles.tag}>Futuro</span>
          </article>
        </div>
      </section>

      <section className={styles.section} id="precios">
        <h2 className={styles.sectionTitle}>Precios</h2>
        <p className={styles.sectionBody}>
          Orientativos. No constituyen oferta comercial vinculante.
        </p>
        <div className={styles.priceGrid}>
          <article className={styles.price}>
            <h3>Weather base</h3>
            <p className={styles.priceAmount}>Incluido</p>
            <p className={styles.priceDetail}>
              Al crear workspace con entitlement Weather. Mapa, parcelas y evidencia climática.
            </p>
            <Link className={styles.cta} href="/sign-up">
              Crear cuenta
            </Link>
          </article>
          <article className={styles.price}>
            <h3>Intelligence Plus</h3>
            <p className={styles.priceAmount}>Próximamente</p>
            <p className={styles.priceDetail}>
              Add-on conversacional. Cobro real en un release posterior.
            </p>
            <Link className={styles.ghost} href="/sign-up">
              Crear cuenta
            </Link>
          </article>
          <article className={styles.price}>
            <h3>Traceability · Review</h3>
            <p className={styles.priceAmount}>En discovery</p>
            <p className={styles.priceDetail}>Productos separados. Sin cobro en este release.</p>
          </article>
        </div>
        <p className={styles.disclaimer}>
          Los precios mostrados son informativos. La suscripción actual abre un workspace vía Clerk;
          no procesamos pagos en esta página.
        </p>
      </section>

      <section className={`${styles.closing} ${styles.reveal}`}>
        <h2 className={styles.sectionTitle}>Empieza con tu primera parcela</h2>
        <p className={styles.sectionBody}>
          Crea la cuenta, activa el workspace y dibuja el lote. El clima llega con evidencia, no con
          promesas.
        </p>
        <div className={styles.actions}>
          <Link className={styles.cta} href="/sign-up">
            Suscribirse
          </Link>
          <Link className={styles.ghost} href="/sign-in">
            Entrar
          </Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <span>Agro AI</span>
        <span>Mercado inicial: Perú</span>
      </footer>
    </main>
  );
}
