import Image from "next/image";
import Link from "next/link";
import { LEGAL_NAV_LINKS } from "@/content/legal/types";
import { LandingAgentDemo } from "@/ui/landing-agent-demo";
import { LandingSpectralHero } from "./landing-spectral-hero";
import { LandingHeader } from "./landing-header";
import { LandingJsonLd } from "./landing-json-ld";
import { LegalFooterLinks } from "@/ui/legal-footer-links";
import { WaitlistForm } from "./waitlist-form";
import styles from "./landing.module.css";

/** ISR: anonymous LP HTML can be CDN-cached (signed-in users redirected in middleware). */
export const revalidate = 3600;

const SOURCES = ["Open-Meteo", "NASA POWER", "GFS / ICON", "ERA5-Land"] as const;

const WEATHER_PILLARS = [
  {
    icon: "⬤",
    label: "Datos observados",
    rows: [
      ["Fuente", "Open-Meteo · NASA POWER"],
      ["Resolución espacial", "~9 km · interpolado a parcela"],
      ["Variables", "T (2 m), HR, precip., viento"],
      ["Historial", "Contexto vía reanálisis (ERA5-Land)"],
    ] as const,
    note: "Datos públicos verificables · alturas según fuente",
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
    note: "Horizonte de planificación operativa · ET0 orientativo (Plus)",
  },
] as const;

const PAIN_BLOCKS = [
  {
    title: "Un índice de hoy no muestra tendencia",
    body: "Un solo valor NDRE o EVI no dice si el cultivo viene recuperándose o cayendo. Sin historial de escenas y comparación en el tiempo, la decisión queda a ciegas.",
  },
  {
    title: "Sin un copiloto que una clima, vigor y campo",
    body: "Preguntas sueltas no cruzan pronóstico, índices satelitales y lo anotado en Campo. El agente responde en lenguaje natural sobre tu parcela —con la fuente a mano cuando la necesitas.",
  },
] as const;

const SAMPLE_METRICS = [
  ["18.4 °C", "Temp. (2 m obs)"],
  ["82 %", "Humedad rel."],
  ["3.1 mm", "Precip. hoy"],
  ["2.3 m/s NE", "Viento (10 m fcst)"],
] as const;

const PRODUCTS = [
  {
    title: "Weather Intelligence Plus",
    subtitle: null as string | null,
    disclaimer: null as string | null,
    body: "Clima, vigor satelital y agente en el contorno de tu parcela. Pregunta en lenguaje natural, recibe briefings y respuestas con contexto —sin prometer alertas oficiales ni dosis.",
    features: [
      "Briefing diario con señales climáticas (Plus)",
      "ET0 orientativo e informe hídrico (no dosis)",
      "8 índices (NDRE, EVI, …) con overlay Sentinel/CDSE",
      "Zonas fishnet, historial de escenas y timeline",
      "Agente con citas a NASA POWER y CDSE",
      "Bitácora Campo con foto opcional",
      "Exportación de datos (API y CSV en roadmap)",
    ],
    coffee: false,
    skyDots: false,
  },
  {
    title: "Trazabilidad",
    subtitle: "Café · EUDR",
    disclaimer:
      "Herramienta de apoyo documental; no constituye certificación EUDR ni due diligence legal.",
    body: "Registro georreferenciado de origen y apoyo documental para exportadores. Combina datos de campo, clima y cadena de custodia en la cuenta de equipo.",
    features: [
      "Polígonos de parcela en la cuenta de equipo",
      "Cadena de custodia por lote (piloto)",
      "Exportables orientados a EUDR (en desarrollo)",
      "Referencia al Reglamento EU 2023/1115",
    ],
    coffee: true,
    skyDots: true,
  },
  {
    title: "Revisión Agronómica",
    subtitle: null,
    disclaimer: null,
    body: "Decisiones agronómicas formales con trazabilidad en la cuenta de equipo. Complementa la bitácora de campo con registro identificado del agrónomo —sin edición posterior, sin firma criptográfica.",
    features: [
      "Registro formal de decisiones (plan Empresa)",
      "Registro inmutable de intervenciones",
      "Identificación del agrónomo responsable",
      "Historial auditable en la cuenta de equipo",
      "Plan Operations Intelligence y superiores",
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
      "Observación y pronóstico con fuente citada",
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
      "Weather Intelligence Plus",
      "Hasta 5 miembros (plan Profesional)",
      "Soporte por correo durante piloto",
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
      "Trazabilidad y Revisión Agronómica",
      "Hasta 15–25 miembros según plan",
      "Soporte y onboarding (sin SLA salvo contrato)",
      "Capacitación sujeta a disponibilidad",
    ],
    highlight: false,
    cta: "Contactar",
  },
] as const;

const ROADMAP = [
  { done: true, label: "Integración Open-Meteo + NASA POWER" },
  { done: true, label: "Índices Sentinel y overlay CDSE (Plus)" },
  { done: true, label: "Piloto con productores en curso" },
  { done: true, label: "Trazabilidad piloto en cuenta de equipo" },
  { done: false, label: "Export EUDR y API pública v1" },
  { done: false, label: "Lanzamiento comercial" },
] as const;

export default function Home() {
  return (
    <div className={styles.page}>
      <LandingJsonLd />
      <LandingHeader />

      <section className={styles.hero}>
        <LandingSpectralHero>
          <div className={styles.heroCopyEmbedded}>
            <div className={styles.heroEyebrowRow}>
              <span className={styles.heroEyebrowPill}>geoagro.ai · Perú</span>
              <span className={styles.heroEyebrowPillSky}>Piloto 2026</span>
            </div>
            <h1 className={styles.heroTitle}>
              El clima y el vigor de tu parcela —<em>con fuente y evidencia.</em>
            </h1>
            <p className={styles.heroSupport}>
              Un agente agronómico que une clima, índices{" "}
              <strong>Sentinel-2</strong> y bitácora de campo — anclado al contorno de tu
              parcela.
            </p>
            <p className={styles.heroSupportSecondary}>
              Datos públicos (~9 km) interpolados al polígono · Open-Meteo, NASA POWER, CDSE —
              citados cuando importa.
            </p>
            <div className={styles.heroCtas}>
              <a href="#lista" className={styles.btnPrimaryLg}>
                Unirse a la lista de espera
              </a>
              <a href="#agente" className={styles.btnGhost}>
                Conocer el agente ↓
              </a>
            </div>
            <div className={styles.heroTrustRowLight}>
              <div>
                <p className={styles.heroTrustLabelLight}>Clima anclado</p>
                <p className={styles.heroTrustMetaLight}>Open-Meteo + NASA POWER</p>
              </div>
              <div>
                <p className={styles.heroTrustLabelLight}>8 índices</p>
                <p className={styles.heroTrustMetaLight}>Sentinel-2 · CDSE</p>
              </div>
              <div>
                <p className={styles.heroTrustLabelLight}>Fuente citada</p>
                <p className={styles.heroTrustMetaLight}>en cada respuesta</p>
              </div>
            </div>
            <WaitlistForm />
          </div>
        </LandingSpectralHero>

        <div className={styles.evidenceBar}>
          <div className={styles.evidenceInner}>
            <span className={styles.evidenceMuted}>Fuentes ·</span>
            {SOURCES.map((source, index) => (
              <span key={source} className={styles.evidenceItem}>
                {index > 0 ? <span className={styles.evidenceDot}>·</span> : null}
                <span>{source}</span>
              </span>
            ))}
            <span className={styles.evidenceAside}>Citado en el agente cuando lo necesitas</span>
          </div>
        </div>
      </section>

      <section id="plataforma" className={styles.section}>
        <div className={styles.sectionWide}>
          <div className={styles.problemGrid}>
            <div>
              <p className={styles.eyebrow}>El problema</p>
              <h2 className={styles.sectionTitle}>
                La estación más cercana
                <br />está lejos. <em>Tu cultivo, no.</em>
              </h2>
              <div className={styles.prose}>
                <p>
                  Muchas decisiones se toman con el clima de la ciudad o del aeropuerto:
                  otra temperatura, otra humedad, otra radiación. En la sierra y la selva
                  alta del Perú, esa diferencia puede equivaler a 8 °C y 200 mm de lluvia al
                  año.
                </p>
                <p>
                  Un modelo de ciudad no captura la neblina matutina de tu parcela,
                  la helada nocturna del fondo del valle, ni el aguacero que cayó a
                  2 km de la estación más cercana.
                </p>
                <p className={styles.proseAccent}>
                  Agro AI ancla clima y vigor al contorno de tu campo —y el agente los usa
                  para responderte.
                </p>
              </div>
              <div className={styles.painGrid}>
                {PAIN_BLOCKS.map((block) => (
                  <article key={block.title} className={styles.painCard}>
                    <h3 className={styles.painTitle}>{block.title}</h3>
                    <p className={styles.painBody}>{block.body}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className={styles.problemVisual}>
              <Image
                src="/landing/problem.jpg"
                alt="Vista aérea de vastos campos agrícolas con montañas nevadas al fondo en el Perú"
                className={styles.problemImg}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                quality={75}
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
                  <p className={styles.compareMetaOnDark}>Agro AI · parcela demo</p>
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
              Clima observado y pronóstico son la base del agente: briefings, consultas y
              lecturas espectrales parten de datos anclados a tu parcela, con fuente visible
              cuando importa.
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
              Muestra ilustrativa · parcela demo
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

      <div className={styles.divider} />

      <section id="agente" className={styles.section}>
        <div className={styles.sectionWide}>
          <p className={styles.eyebrow}>El agente</p>
          <div className={styles.agentIntro}>
            <h2 className={styles.sectionTitle}>
              Pregunta en lenguaje natural —
              <br />
              <em>con fuente y contexto de parcela.</em>
            </h2>
            <p className={styles.agentLead}>
              El Agro Agent cruza clima, índices Sentinel y bitácora de Campo. Cita
              proveedor y ventana temporal; no inventa datos ni sustituye la visita de
              campo.
            </p>
          </div>

          <div className={styles.agentGrid}>
            <div className={styles.agentCopy}>
              <ul className={styles.agentBullets}>
                <li>Respuestas en Markdown con tablas y citas a CDSE / Open-Meteo</li>
                <li>Orientación basada en evidencia — sin prescripciones ciegas</li>
                <li>Historial por parcela según plan contratado</li>
              </ul>
              <p className={styles.agentNote}>
                En la app, el agente consulta en el mismo turno clima, espectral, perfil y
                notas de campo.
              </p>
            </div>
            <div className={styles.agentDemoSlot}>
              <LandingAgentDemo />
            </div>
          </div>
        </div>
      </section>

      <section id="productos" className={styles.section}>
        <div className={styles.sectionWide}>
          <div className={styles.productsHead}>
            <div>
              <p className={styles.eyebrowTight}>Productos</p>
              <h2 className={styles.sectionTitle}>En piloto y desarrollo activo.</h2>
            </div>
            <p className={styles.productsAside}>
              Módulos en evolución para productores y técnicos en Perú. Las capacidades
              dependen del plan contratado en tu cuenta de equipo.
            </p>
          </div>

          <div className={styles.productGrid}>
            {PRODUCTS.map((product) => (
              <article
                key={product.title}
                className={`${styles.product} ${product.coffee ? styles.productCoffee : ""}`}
              >
                {product.coffee ? (
                  <Image
                    src="/landing/coffee.jpg"
                    alt=""
                    className={styles.productCoffeeBg}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    quality={60}
                  />
                ) : null}
                <div className={styles.productInner}>
                  <span className={styles.pilotoTag}>Piloto</span>
                  <h3 className={styles.productTitle}>{product.title}</h3>
                  {product.subtitle ? (
                    <p className={styles.productSubtitle}>{product.subtitle}</p>
                  ) : null}
                  <p className={styles.productBody}>{product.body}</p>
                  {product.disclaimer ? (
                    <p className={styles.productDisclaimer}>{product.disclaimer}</p>
                  ) : null}
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
              Referencia en USD. <em>Sin contratación en la web pública.</em>
            </h2>
            <p className={styles.pricingNotice}>
              <strong>Aviso legal:</strong> Los montos mostrados son orientativos para
              comparar planes. No constituyen oferta vinculante hasta completar el checkout en
              un workspace autenticado. El piloto y la lista de espera no requieren pago ni
              tarjeta.
            </p>
            <p className={styles.pricingNotice}>
              Consulte{" "}
              {LEGAL_NAV_LINKS.map((link, index) => (
                <span key={link.slug}>
                  {index > 0 ? (index === LEGAL_NAV_LINKS.length - 1 ? " y " : ", ") : null}
                  <Link href={link.href}>{link.label}</Link>
                </span>
              ))}
              .
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
                Piloto abierto · <em>producción comercial después.</em>
              </h2>
              <p className={styles.closingBody}>
                Productores y técnicos en Perú pueden solicitar acceso al piloto sin
                costo. El lanzamiento comercial y el cobro en línea llegarán cuando
                cerremos la fase piloto.
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
            © 2026 Agro AI. Todos los derechos reservados. Perú.
          </span>
          <LegalFooterLinks showContact className={styles.footerLinks} />
        </div>
      </footer>
    </div>
  );
}
