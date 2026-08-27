import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import styles from "./landing.module.css";

function HeroMapVisual() {
  return (
    <svg
      className={styles.heroImage}
      viewBox="0 0 1600 900"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Mapa con parcela agrícola resaltada"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="land" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c5b89a" />
          <stop offset="45%" stopColor="#a8b59a" />
          <stop offset="100%" stopColor="#7f9a78" />
        </linearGradient>
        <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
          <path
            d="M 48 0 L 0 0 0 48"
            fill="none"
            stroke="rgba(28,42,31,0.08)"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="1600" height="900" fill="url(#land)" />
      <rect width="1600" height="900" fill="url(#grid)" />
      <path
        d="M0 520 C 220 480, 380 560, 560 540 S 920 470, 1120 510 1400 580, 1600 540 L1600 900 L0 900 Z"
        fill="#5b8fa8"
        opacity="0.35"
      />
      <path
        d="M120 180 C 340 140, 520 220, 760 190 S 1180 120, 1480 170"
        fill="none"
        stroke="#d4c49a"
        strokeWidth="14"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path
        d="M80 700 C 300 640, 540 720, 820 680 S 1240 620, 1520 690"
        fill="none"
        stroke="#d4c49a"
        strokeWidth="10"
        strokeLinecap="round"
        opacity="0.55"
      />
      <polygon
        points="980,290 1240,310 1210,520 940,490"
        fill="#4F6F52"
        fillOpacity="0.72"
        stroke="#1C2A1F"
        strokeWidth="6"
      />
      <circle cx="1090" cy="400" r="10" fill="#FFFDF8" />
      <circle cx="1090" cy="400" r="18" fill="none" stroke="#FFFDF8" strokeWidth="3" opacity="0.7" />
    </svg>
  );
}

export default async function Home() {
  const { userId } = await auth();
  if (userId) {
    redirect("/app");
  }

  return (
    <main className={styles.page}>
      <section className={styles.heroPlane} aria-label="Agro AI">
        <HeroMapVisual />
        <div className={styles.heroShade} aria-hidden />

        <header className={styles.top}>
          <p className={styles.brand}>Agro AI</p>
          <nav className={styles.nav}>
            <Link className={styles.ghostOnDark} href="/sign-in">
              Entrar
            </Link>
            <Link className={styles.cta} href="/sign-up">
              Crear cuenta
            </Link>
          </nav>
        </header>

        <div className={`${styles.heroCopy} ${styles.reveal}`}>
          <p className={styles.statusLine}>Pronto en producción</p>
          <h1 className={styles.headline}>Clima confiable para tu parcela exacta</h1>
          <p className={styles.support}>
            Observación y pronóstico con fuente, frescura y alcance espacial
            explícitos. Sin inventar datos cuando la evidencia falta. Mercado
            inicial: Perú.
          </p>
          <div className={styles.actions}>
            <Link className={styles.cta} href="/sign-in">
              Acceso piloto
            </Link>
            <Link className={styles.ghostOnDark} href="/sign-up">
              Crear cuenta
            </Link>
          </div>
        </div>
      </section>

      <div className={styles.body}>
        <section className={`${styles.section} ${styles.revealDelay}`}>
          <h2 className={styles.sectionTitle}>El problema</h2>
          <p className={styles.sectionBody}>
            El clima genérico de la ciudad no describe tu lote. Falta saber de qué
            fuente viene el dato, cuándo se observó, hasta cuándo vale el
            pronóstico y si sigue fresco — antes de decidir en campo.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Weather base</h2>
          <p className={styles.sectionBody}>
            Primer producto de Agro AI: contexto climático parcel-aware,
            determinístico y auditable.
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
            Weather es el inicio. El mismo workspace activa productos con
            permisos scoped — sin mezclar evidencia ni autoridad.
          </p>
          <div className={styles.productGrid}>
            <article className={styles.product}>
              <h3>Intelligence Plus</h3>
              <p>
                Consultas conversacionales parcel-aware con fuentes e
                incertidumbre explícitas.
              </p>
              <span className={styles.tag}>Disponible · piloto</span>
            </article>
            <article className={styles.product}>
              <h3>Traceability</h3>
              <p>Piloto coffee / EUDR: cadena de lotes y evidencia de origen.</p>
              <span className={styles.tag}>Piloto coffee</span>
            </article>
            <article className={styles.product}>
              <h3>Agronomic Review</h3>
              <p>Decisiones humanas append-only sobre la evidencia acumulada.</p>
              <span className={styles.tag}>Disponible · piloto</span>
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
                Al crear workspace con entitlement Weather. Mapa, parcelas y
                evidencia climática.
              </p>
              <Link className={styles.cta} href="/sign-in">
                Acceso piloto
              </Link>
            </article>
            <article className={styles.price}>
              <h3>Intelligence Plus</h3>
              <p className={styles.priceAmount}>Piloto</p>
              <p className={styles.priceDetail}>
                Add-on conversacional activo en orgs con entitlement. Cobro real
                en un release posterior.
              </p>
              <Link className={styles.ghost} href="/sign-in">
                Acceso piloto
              </Link>
            </article>
            <article className={styles.price}>
              <h3>Traceability · Review</h3>
              <p className={styles.priceAmount}>Piloto</p>
              <p className={styles.priceDetail}>
                Traceability coffee/EUDR y Review append-only activos en piloto.
                Sin cobro aún.
              </p>
            </article>
          </div>
          <p className={styles.disclaimer}>
            Precios informativos. No constituyen oferta comercial. El acceso
            actual es piloto vía Clerk; no procesamos pagos en esta página. La
            producción pública estará disponible pronto.
          </p>
        </section>

        <section className={`${styles.closing} ${styles.reveal}`}>
          <h2 className={styles.sectionTitle}>Pronto en producción</h2>
          <p className={styles.sectionBody}>
            Agro AI ya opera en piloto con parcelas, clima, Plus, trazabilidad y
            revisión agronómica. La apertura pública llegará pronto — mientras
            tanto, los workspaces invitados pueden entrar.
          </p>
          <div className={styles.actions}>
            <Link className={styles.cta} href="/sign-in">
              Acceso piloto
            </Link>
            <Link className={styles.ghost} href="/sign-up">
              Crear cuenta
            </Link>
          </div>
        </section>

        <footer className={styles.footer}>
          <span>Agro AI</span>
          <span>Mercado inicial: Perú · Pronto en producción</span>
        </footer>
      </div>
    </main>
  );
}
