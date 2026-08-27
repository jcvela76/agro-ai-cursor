import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { LandingHeader } from "./landing-header";
import { WaitlistForm } from "./waitlist-form";
import styles from "./landing.module.css";

const SOURCES = ["Open-Meteo", "NASA POWER", "GFS / ICON", "ERA5-Land"] as const;

const WEATHER_PILLARS = [
  {
    icon: "⬤",
    label: "Datos observados",
    rows: [
      ["Fuente", "Open-Meteo · NASA POWER"],
      ["Resolución espacial", "~9 km · interpolado a parcela"],
      ["Variables", "T, HR, precipitación, viento"],
      ["Historial", "Desde 1940 (ERA5-Land)"],
    ] as const,
    note: "Datos públicos verificables",
  },
  {
    icon: "◈",
    label: "Reanálisis histórico",
    rows: [
      ["Fuente", "NASA POWER · ERA5-Land"],
      ["Cobertura", "40+ años de registro"],
      ["Resolución base", "0.5° → interpolado"],
      ["Usos", "climatología, normas agronómicas"],
    ] as const,
    note: "Contexto histórico de largo plazo",
  },
  {
    icon: "◇",
    label: "Pronóstico operacional",
    rows: [
      ["Modelos", "Open-Meteo (GFS, ICON, GEM)"],
      ["Alcance", "Varios días a la vista"],
      ["Actualización", "Según disponibilidad del modelo"],
      ["Ensamble", "En desarrollo"],
    ] as const,
    note: "Horizonte de planificación operativa",
  },
] as const;

const SAMPLE_METRICS = [
  ["18.4 °C", "Temperatura"],
  ["82 %", "Humedad rel."],
  ["3.1 mm", "Precip. hoy"],
  ["2.3 m/s NE", "Viento"],
] as const;

const PRODUCTS = [
  {
    title: "Intelligence Plus",
    subtitle: null as string | null,
    body: "Inteligencia climática a nivel parcela. Alertas configurables por cultivo, umbrales personalizados y análisis de riesgo agronómico integrado.",
    features: [
      "Alertas por temperatura y precipitación",
      "Índices ETo y balance hídrico estimado",
      "Mapa de parcelas con historial climático",
      "Exportación CSV · API REST",
    ],
    coffee: false,
    skyDots: false,
  },
  {
    title: "Trazabilidad",
    subtitle: "Café · EUDR",
    body: "Registro georreferenciado de origen para cumplimiento EUDR. Combina datos de campo, clima y cadena de custodia en un expediente exportable.",
    features: [
      "Polígonos de parcela verificados",
      "Cadena de custodia por lote",
      "Informe EUDR exportable (PDF + JSON)",
      "Orientado al Reglamento EU 2023/1115",
    ],
    coffee: true,
    skyDots: true,
  },
  {
    title: "Revisión Agronómica",
    subtitle: null,
    body: "Bitácora de campo con firma digital. Cada registro es append-only: no se modifica ni se elimina. Trazabilidad completa de intervenciones agronómicas.",
    features: [
      "Registro inmutable de intervenciones",
      "Firma digital por agrónomo",
      "Historial auditable exportable",
      "Integración con Intelligence Plus",
    ],
    coffee: false,
    skyDots: false,
  },
] as const;

const PRICING = [
  {
    tier: "Básico",
    desc: "Para productores individuales",
    price: "Consultar",
    period: "tarifa al lanzamiento",
    features: [
      "Datos climáticos por parcela",
      "Pronóstico a varios días",
      "Alertas por correo electrónico",
      "Parcelas limitadas",
    ],
    highlight: false,
    cta: "Consultar",
  },
  {
    tier: "Profesional",
    desc: "Para técnicos y consultores",
    price: "Incluido",
    period: "en piloto · sin costo",
    features: [
      "Todo en Básico",
      "Intelligence Plus completo",
      "API de datos + exportación CSV",
      "Revisión Agronómica",
      "Soporte por correo",
    ],
    highlight: true,
    cta: "Lista de espera →",
  },
  {
    tier: "Empresa",
    desc: "Cooperativas y exportadores",
    price: "Consultar",
    period: "volumen + soporte dedicado",
    features: [
      "Todo en Profesional",
      "Trazabilidad EUDR completa",
      "Integración personalizada",
      "SLA y soporte prioritario",
      "Capacitación en campo",
    ],
    highlight: false,
    cta: "Contactar",
  },
] as const;

const ROADMAP = [
  { done: true, label: "Integración Open-Meteo + NASA POWER" },
  { done: true, label: "Motor de alertas agronómicas" },
  { done: true, label: "Piloto con productores en Junín" },
  { done: false, label: "Módulo Trazabilidad EUDR (beta)" },
  { done: false, label: "API pública v1" },
  { done: false, label: "Lanzamiento comercial" },
] as const;

export default async function Home() {
  const { userId } = await auth();
  if (userId) {
    redirect("/app");
  }

  return (
    <div className={styles.page}>
      <LandingHeader />

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>geoagro.ai · Perú</p>
          <h1 className={styles.heroTitle}>
            El clima exacto <em>de tu parcela.</em>
            <br />
            No del aeropuerto.
          </h1>
          <p className={styles.heroSupport}>
            Datos climáticos georreferenciados por parcela —con fuente, frescura y
            alcance espacial explícitos. Fuentes: Open-Meteo · NASA POWER.
          </p>
          <div className={styles.heroCtas}>
            <a href="#lista" className={styles.btnPrimaryLg}>
              Inscribirse en lista de espera
            </a>
            <a href="#plataforma" className={styles.btnGhost}>
              Más información
            </a>
          </div>
          <p className={styles.heroHint}>Te avisamos cuando abra el piloto.</p>
          <WaitlistForm />
        </div>

        <div className={styles.heroBleed}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/landing/hero.jpg"
            alt="Andenes agrícolas en la sierra peruana bajo cielo despejado con montañas al fondo"
            className={styles.heroImg}
          />
        </div>

        <div className={styles.evidenceBar}>
          <div className={styles.evidenceInner}>
            <span className={styles.evidenceMuted}>Fuentes ·</span>
            {SOURCES.map((source, index) => (
              <span key={source} className={styles.evidenceItem}>
                {index > 0 ? <span className={styles.evidenceDot}>·</span> : null}
                <span>{source}</span>
              </span>
            ))}
            <span className={styles.evidenceAside}>Datos públicos verificables</span>
          </div>
        </div>
      </section>

      <section id="plataforma" className={styles.section}>
        <div className={styles.sectionWide}>
          <div className={styles.problemGrid}>
            <div>
              <p className={styles.eyebrow}>El problema</p>
              <h2 className={styles.sectionTitle}>
                El aeropuerto queda
                <br />a 80 km. <em>Tu cultivo, no.</em>
              </h2>
              <div className={styles.prose}>
                <p>
                  Los servicios meteorológicos tradicionales reportan el clima de
                  estaciones urbanas —muchas veces a más de 50 km de distancia y a
                  otra altitud. En la sierra y la selva alta del Perú, esa diferencia
                  puede equivaler a 8 °C y 200 mm de lluvia al año.
                </p>
                <p>
                  Un modelo de ciudad no captura la neblina matutina de tu parcela,
                  la helada nocturna del fondo del valle, ni el aguacero que cayó a
                  2 km de la estación más cercana.
                </p>
                <p className={styles.proseAccent}>
                  Agro AI ancla los datos al contorno exacto de tu campo.
                </p>
              </div>
            </div>

            <div className={styles.problemVisual}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/landing/problem.jpg"
                alt="Vista aérea de vastos campos agrícolas con montañas nevadas al fondo en el Perú"
                className={styles.problemImg}
              />
              <div className={styles.compareOverlay}>
                <div className={styles.compareCity}>
                  <p className={styles.compareLabel}>Ciudad · 58 km</p>
                  <p className={styles.compareValue}>24 °C</p>
                  <p className={styles.compareMeta}>Open-Meteo / ciudad</p>
                </div>
                <div className={styles.compareParcel}>
                  <p className={styles.compareLabelOnDark}>Tu parcela</p>
                  <p className={styles.compareValueOnDark}>17 °C</p>
                  <p className={styles.compareMetaOnDark}>Agro AI · parcela #4812</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.divider} />

      <section className={styles.sectionPanel}>
        <div className={styles.sectionWide}>
          <p className={styles.eyebrow}>Base climática</p>
          <div className={styles.weatherIntro}>
            <h2 className={styles.sectionTitle}>
              Observación +
              <br />
              Pronóstico. <em>Con fuente y frescura.</em>
            </h2>
            <p className={styles.weatherLead}>
              Cada dato publicado en Agro AI incluye su fuente, horizonte de
              actualización y resolución espacial. No ofrecemos promedios sin
              contexto ni cifras sin respaldo.
            </p>
          </div>

          <div className={styles.pillarGrid}>
            {WEATHER_PILLARS.map((pillar) => (
              <article key={pillar.label} className={styles.pillar}>
                <span className={styles.pillarIcon} aria-hidden>
                  {pillar.icon}
                </span>
                <h3 className={styles.pillarTitle}>{pillar.label}</h3>
                <div className={styles.pillarRows}>
                  {pillar.rows.map(([key, value]) => (
                    <div key={key} className={styles.pillarRow}>
                      <span>{key}</span>
                      <span>{value}</span>
                    </div>
                  ))}
                </div>
                <p className={styles.pillarNote}>{pillar.note}</p>
              </article>
            ))}
          </div>

          <div className={styles.sampleBar}>
            <span className={styles.sampleLabel}>
              Muestra ilustrativa · parcela en Junín
            </span>
            <div className={styles.sampleMetrics}>
              {SAMPLE_METRICS.map(([value, label]) => (
                <div key={label}>
                  <p className={styles.sampleValue}>{value}</p>
                  <p className={styles.sampleMeta}>{label}</p>
                </div>
              ))}
            </div>
            <span className={styles.sampleAside}>
              Valores ilustrativos · no en tiempo real
            </span>
          </div>
        </div>
      </section>

      <section id="productos" className={styles.section}>
        <div className={styles.sectionWide}>
          <div className={styles.productsHead}>
            <div>
              <p className={styles.eyebrowTight}>Productos</p>
              <h2 className={styles.sectionTitle}>En piloto activo.</h2>
            </div>
            <p className={styles.productsAside}>
              Acceso disponible para productores y técnicos en Perú durante la fase
              piloto.
            </p>
          </div>

          <div className={styles.productGrid}>
            {PRODUCTS.map((product) => (
              <article
                key={product.title}
                className={`${styles.product} ${product.coffee ? styles.productCoffee : ""}`}
              >
                {product.coffee ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src="/landing/coffee.jpg"
                    alt=""
                    aria-hidden
                    className={styles.productCoffeeBg}
                  />
                ) : null}
                <div className={styles.productInner}>
                  <span className={styles.pilotoTag}>Piloto</span>
                  <h3 className={styles.productTitle}>{product.title}</h3>
                  {product.subtitle ? (
                    <p className={styles.productSubtitle}>{product.subtitle}</p>
                  ) : null}
                  <p className={styles.productBody}>{product.body}</p>
                  <ul className={styles.featureList}>
                    {product.features.map((feature) => (
                      <li key={feature}>
                        <span
                          className={`${styles.dot} ${product.skyDots ? styles.dotSky : ""}`}
                          aria-hidden
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="precios" className={styles.sectionPanel}>
        <div className={styles.sectionWide}>
          <p className={styles.eyebrow}>Precios</p>
          <div className={styles.pricingIntro}>
            <h2 className={styles.sectionTitle}>
              Informativo. <em>Sin compromiso de pago.</em>
            </h2>
            <p className={styles.pricingNotice}>
              <strong>Aviso:</strong> Estructura de planes referencial, sin tarifas
              definidas. El acceso piloto es completamente gratuito. No se requiere
              tarjeta de crédito ni compromiso de contratación.
            </p>
          </div>

          <div className={styles.priceGrid}>
            {PRICING.map((tier) => (
              <article
                key={tier.tier}
                className={`${styles.priceCard} ${tier.highlight ? styles.priceHighlight : ""}`}
              >
                <div className={styles.priceHead}>
                  <h3>{tier.tier}</h3>
                  <p>{tier.desc}</p>
                </div>
                <div className={styles.priceAmountRow}>
                  <span className={styles.priceAmount}>{tier.price}</span>
                  <span className={styles.pricePeriod}>{tier.period}</span>
                </div>
                <ul className={styles.featureList}>
                  {tier.features.map((feature) => (
                    <li key={feature}>
                      <span className={styles.dot} aria-hidden />
                      {feature}
                    </li>
                  ))}
                </ul>
                <a
                  href="#lista"
                  className={
                    tier.highlight ? styles.btnOnDark : styles.btnOutline
                  }
                >
                  {tier.cta}
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="lista" className={styles.closing}>
        <div className={styles.sectionWide}>
          <div className={styles.closingGrid}>
            <div>
              <p className={styles.eyebrowOnDark}>Estado del producto</p>
              <h2 className={styles.closingTitle}>
                Pronto en <em>producción.</em>
              </h2>
              <p className={styles.closingBody}>
                Productores y técnicos en Perú que participen en el piloto recibirán
                condiciones preferenciales de acceso al lanzamiento. Sin costo durante
                la fase piloto.
              </p>
              <p className={styles.closingHint}>
                Te avisamos cuando abra el piloto
              </p>
              <WaitlistForm dark id="lista-form" />
              <p className={styles.closingFine}>
                Sin spam. Sin compromiso. Solo aviso de apertura.
              </p>
            </div>

            <div className={styles.roadmap}>
              <p className={styles.roadmapLabel}>Hoja de ruta · 2025–2026</p>
              <ul className={styles.roadmapList}>
                {ROADMAP.map((item) => (
                  <li key={item.label}>
                    <span
                      className={
                        item.done ? styles.roadmapDone : styles.roadmapTodo
                      }
                      aria-hidden
                    >
                      {item.done ? "✓" : ""}
                    </span>
                    <span className={item.done ? styles.roadmapTextDone : styles.roadmapTextTodo}>
                      {item.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.footerBrand}>Agro AI · geoagro.ai</span>
          <span className={styles.footerCopy}>
            © 2025 Agro AI. Todos los derechos reservados. Perú.
          </span>
          <div className={styles.footerLinks}>
            <a href="mailto:hola@geoagro.ai">hola@geoagro.ai</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
