import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { WaitlistForm } from "./waitlist-form";
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
      <circle
        cx="1090"
        cy="400"
        r="18"
        fill="none"
        stroke="#FFFDF8"
        strokeWidth="3"
        opacity="0.7"
      />
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
            <a className={styles.ghostOnDark} href="#problema">
              Problema
            </a>
            <a className={styles.ghostOnDark} href="#productos">
              Productos
            </a>
            <Link className={styles.ghostOnDark} href="/sign-in">
              Entrar
            </Link>
            <a className={styles.cta} href="#lista-espera">
              Lista de espera
            </a>
          </nav>
        </header>

        <div className={`${styles.heroCopy} ${styles.reveal}`}>
          <p className={styles.statusLine}>geoagro.ai · Perú · Pronto en producción</p>
          <h1 className={styles.headline}>
            El clima exacto de tu parcela.
            <span className={styles.headlineBreak}> No del aeropuerto.</span>
          </h1>
          <p className={styles.support}>
            Observación y pronóstico parcel-aware con fuente, frescura y alcance
            espacial explícitos. Sin inventar datos cuando la evidencia falta.
          </p>
          <WaitlistForm id="lista-espera" variant="hero" />
          <p className={styles.sourcesLine}>
            Fuentes · Open-Meteo · NASA POWER
          </p>
        </div>
      </section>

      <div className={styles.body}>
        <section className={`${styles.section} ${styles.revealDelay}`} id="problema">
          <p className={styles.eyebrow}>El problema</p>
          <h2 className={styles.sectionTitle}>
            El clima de la ciudad no describe tu lote
          </h2>
          <p className={styles.sectionBody}>
            Falta saber de qué fuente viene el dato, cuándo se observó, hasta
            cuándo vale el pronóstico y si sigue fresco — antes de decidir en
            campo. Agro AI ancla el contexto al contorno autorizado de tu parcela.
          </p>
          <div className={styles.compareRow}>
            <article className={styles.compare}>
              <p className={styles.compareLabel}>Ciudad · estación lejana</p>
              <p className={styles.compareValue}>Genérico</p>
              <p className={styles.compareDetail}>Sin alcance espacial del lote</p>
            </article>
            <article className={styles.compareAccent}>
              <p className={styles.compareLabel}>Tu parcela</p>
              <p className={styles.compareValue}>Con evidencia</p>
              <p className={styles.compareDetail}>Fuente · frescura · alcance</p>
            </article>
          </div>
        </section>

        <section className={styles.section}>
          <p className={styles.eyebrow}>Weather base</p>
          <h2 className={styles.sectionTitle}>
            Observación + pronóstico. Con fuente y frescura.
          </h2>
          <p className={styles.sectionBody}>
            Primer producto de Agro AI: contexto climático determinístico y
            auditable sobre parcelas del workspace.
          </p>
          <ul className={styles.list}>
            <li>Parcela autorizada del workspace, dibujada en el mapa</li>
            <li>Observación ordinaria con evidencia completa</li>
            <li>Pronóstico ordinario con horizonte y validez</li>
            <li>
              Estados cerrados: no disponible, obsoleto, error — nunca fabricados
            </li>
          </ul>
        </section>

        <section className={styles.section} id="productos">
          <p className={styles.eyebrow}>Productos</p>
          <h2 className={styles.sectionTitle}>En piloto activo</h2>
          <p className={styles.sectionBody}>
            El mismo workspace activa productos con permisos scoped — sin mezclar
            evidencia ni autoridad.
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
          <p className={styles.eyebrow}>Precios</p>
          <h2 className={styles.sectionTitle}>Referencial. Sin compromiso de pago.</h2>
          <p className={styles.sectionBody}>
            Orientativos para el lanzamiento. No constituyen oferta comercial
            vinculante. El acceso al piloto será por invitación; la lista de
            espera no implica cobro.
          </p>
          <div className={styles.priceGrid}>
            <article className={styles.price}>
              <h3>Weather base</h3>
              <p className={styles.priceAmount}>Incluido</p>
              <p className={styles.priceDetail}>
                Mapa, parcelas y evidencia climática cuando el workspace tenga
                entitlement Weather.
              </p>
            </article>
            <article className={styles.price}>
              <h3>Plus · Trace · Review</h3>
              <p className={styles.priceAmount}>Piloto</p>
              <p className={styles.priceDetail}>
                Activos en orgs invitadas. Cobro real en un release posterior.
              </p>
            </article>
            <article className={styles.price}>
              <h3>Lanzamiento</h3>
              <p className={styles.priceAmount}>Consultar</p>
              <p className={styles.priceDetail}>
                Condiciones públicas se definirán al abrir producción. Sin
                tarjeta en esta página.
              </p>
            </article>
          </div>
          <p className={styles.disclaimer}>
            Precios informativos. No procesamos pagos aquí. SENAMHI y otras
            fuentes pagas quedan fuera hasta gate legal.
          </p>
        </section>

        <section className={`${styles.closing} ${styles.reveal}`}>
          <p className={styles.eyebrow}>Estado del producto</p>
          <h2 className={styles.sectionTitle}>Pronto en producción</h2>
          <p className={styles.sectionBody}>
            Agro AI ya opera en piloto interno. Inscríbete en la lista de espera
            para enterarte cuando abramos el piloto a productores y técnicos en
            Perú.
          </p>
          <WaitlistForm id="lista-espera-cierre" variant="closing" />
          <p className={styles.closingNote}>
            ¿Ya tienes workspace?{" "}
            <Link className={styles.inlineLink} href="/sign-in">
              Entrar
            </Link>
          </p>
        </section>

        <footer className={styles.footer}>
          <span>Agro AI · geoagro.ai</span>
          <span>Mercado inicial: Perú · Pronto en producción</span>
        </footer>
      </div>
    </main>
  );
}
