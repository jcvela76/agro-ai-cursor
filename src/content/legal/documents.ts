import type { LegalDocument } from "./types";
import {
  LEGAL_CONTACT_EMAIL,
  LEGAL_OPERATOR,
  LEGAL_OPERATOR_ADDRESS,
  LEGAL_OPERATOR_LEGAL_NAME,
  LEGAL_OPERATOR_RUC,
} from "./types";

const OPERATOR_LINE = `${LEGAL_OPERATOR} — operado por ${LEGAL_OPERATOR_LEGAL_NAME}, RUC ${LEGAL_OPERATOR_RUC}, domicilio ${LEGAL_OPERATOR_ADDRESS}. Contacto: ${LEGAL_CONTACT_EMAIL}.`;

export const LEGAL_DOCUMENTS: Record<string, LegalDocument> = {
  terms: {
    slug: "terms",
    title: "Términos de servicio",
    description: "Condiciones generales de uso de la plataforma Agro AI.",
    sections: [
      {
        id: "aceptacion",
        heading: "1. Aceptación",
        blocks: [
          {
            type: "paragraph",
            text: "Al acceder o usar Agro AI (geoagro.ai) usted acepta estos Términos. Si actúa en nombre de una organización, declara tener autoridad para vincularla.",
          },
          {
            type: "paragraph",
            text: "El servicio está dirigido a organizaciones y uso profesional B2B. Al contratar, usted declara actuar en nombre de una persona jurídica o negocio con capacidad legal para contratar.",
          },
          {
            type: "paragraph",
            text: "Si no está de acuerdo, no use el servicio.",
          },
        ],
      },
      {
        id: "servicio",
        heading: "2. El servicio",
        blocks: [
          {
            type: "paragraph",
            text: "Agro AI es una plataforma B2B de información agronómica por parcela (clima, trazabilidad piloto, revisión humana y funciones asociadas). El alcance depende del plan y entitlements activos en su workspace.",
          },
          {
            type: "paragraph",
            text: "Las salidas son informativas y de apoyo a la decisión. No sustituyen asesoría agronómica, legal ni regulatoria profesional.",
          },
          {
            type: "paragraph",
            text: "Los módulos de trazabilidad y exportables orientados a EUDR son herramientas de apoyo documental. No constituyen certificación regulatoria, auditoría legal ni garantía de cumplimiento ante autoridades de la UE o del Perú.",
          },
          {
            type: "paragraph",
            text: "Funciones marcadas como piloto o beta pueden cambiar, interrumpirse o retirarse sin compensación. No garantizamos disponibilidad continua ni SLA salvo acuerdo escrito aparte. Cualquier referencia comercial a SLA o soporte prioritario solo rige si existe acuerdo escrito aparte.",
          },
        ],
      },
      {
        id: "cuentas",
        heading: "3. Cuentas y workspaces",
        blocks: [
          {
            type: "bullets",
            items: [
              "Debe proporcionar información veraz y mantener la seguridad de sus credenciales.",
              "Los administradores del workspace gestionan miembros, roles e invitaciones.",
              "Usted es responsable de la actividad bajo su cuenta y la de su organización.",
            ],
          },
        ],
      },
      {
        id: "uso-permitido",
        heading: "4. Uso permitido",
        blocks: [
          {
            type: "bullets",
            items: [
              "Usar el servicio conforme a la ley peruana aplicable y a estos Términos.",
              "No intentar acceder sin autorización, interferir con la plataforma ni extraer datos de forma masiva no permitida.",
              "No subir datos personales sensibles innecesarios ni contenido que infrinja derechos de terceros.",
              "El acceso API o exportación CSV es intransferible, sujeto a límites técnicos y prohibición de reventa o redistribución masiva de datos derivados sin autorización escrita.",
            ],
          },
        ],
      },
      {
        id: "propiedad",
        heading: "5. Propiedad intelectual y datos",
        blocks: [
          {
            type: "paragraph",
            text: "Agro AI conserva los derechos sobre la plataforma, marca y software. Usted conserva los derechos sobre los datos que ingresa (parcelas, decisiones, etc.).",
          },
          {
            type: "paragraph",
            text: "Nos otorga una licencia limitada para procesar esos datos con el fin de prestar y mejorar el servicio, conforme a la Política de privacidad.",
          },
        ],
      },
      {
        id: "disponibilidad",
        heading: "6. Disponibilidad y cambios",
        blocks: [
          {
            type: "paragraph",
            text: "Podemos actualizar funciones, fuentes de datos (p. ej. Open-Meteo, NASA POWER, proveedores pagos) o retirar características en piloto con aviso razonable cuando sea posible.",
          },
          {
            type: "paragraph",
            text: "El entorno de staging (stg.geoagro.ai) es para pruebas; puede diferir de producción.",
          },
          {
            type: "paragraph",
            text: "Podemos actualizar estos Términos publicando la nueva versión en /legal/terms con fecha de vigencia. El uso continuado tras treinta (30) días constituye aceptación, salvo que cancele antes de una renovación de pago cuando el cambio afecte condiciones de cobro.",
          },
        ],
      },
      {
        id: "limitacion",
        heading: "7. Limitación de responsabilidad",
        blocks: [
          {
            type: "paragraph",
            text: "En la máxima medida permitida por la ley peruana, Agro AI no será responsable por daños indirectos, lucro cesante o decisiones tomadas exclusivamente con base en salidas del sistema.",
          },
          {
            type: "paragraph",
            text: "La responsabilidad total agregada por reclamos relacionados con el servicio se limita al monto pagado por su organización en los doce (12) meses anteriores al evento, o cero si no hubo pago.",
          },
        ],
      },
      {
        id: "ley",
        heading: "8. Ley aplicable y contacto",
        blocks: [
          {
            type: "paragraph",
            text: "Estos Términos se rigen por las leyes de la República del Perú. Las controversias se someterán a los tribunales de Lima, salvo norma imperativa distinta.",
          },
          {
            type: "paragraph",
            text: OPERATOR_LINE,
          },
        ],
      },
    ],
  },
  privacy: {
    slug: "privacy",
    title: "Política de privacidad",
    description: "Cómo tratamos datos personales y de workspace en Agro AI.",
    sections: [
      {
        id: "responsable",
        heading: "1. Responsable del tratamiento",
        blocks: [
          {
            type: "paragraph",
            text: OPERATOR_LINE,
          },
          {
            type: "paragraph",
            text: `Contacto de privacidad: ${LEGAL_CONTACT_EMAIL} (asunto «Privacidad — [workspace]»).`,
          },
        ],
      },
      {
        id: "datos",
        heading: "2. Datos que tratamos",
        blocks: [
          {
            type: "bullets",
            items: [
              "Identificación y contacto: nombre, correo, organización (vía proveedor de autenticación Clerk).",
              "Datos de uso: logs técnicos, dirección IP, eventos de producto necesarios para operación y seguridad.",
              "Datos de workspace: parcelas, geometrías, decisiones de revisión, lotes de trazabilidad y metadatos asociados.",
              "Facturación: estado de suscripción y plan (procesado por Clerk Billing / Stripe cuando aplique); no almacenamos números completos de tarjeta.",
              "Lista de espera: correo proporcionado voluntariamente al inscribirse en el piloto.",
            ],
          },
        ],
      },
      {
        id: "finalidades",
        heading: "3. Finalidades",
        blocks: [
          {
            type: "bullets",
            items: [
              "Prestar el servicio, autenticar usuarios y administrar workspaces.",
              "Gestionar suscripciones y entitlements cuando el cliente contrate un plan de pago.",
              "Comunicar novedades del piloto y acceso a la lista de espera.",
              "Mejorar seguridad, soporte y calidad del producto.",
              "Cumplir obligaciones legales aplicables en Perú.",
            ],
          },
        ],
      },
      {
        id: "base-legal",
        heading: "4. Base legal (Perú)",
        blocks: [
          {
            type: "paragraph",
            text: "El tratamiento se basa en la ejecución del contrato o relación precontractual, el consentimiento cuando corresponda (p. ej. lista de espera), el interés legítimo en seguridad y mejora del servicio, y el cumplimiento de obligaciones legales, de conformidad con la Ley N.° 29733 y su reglamento.",
          },
        ],
      },
      {
        id: "cookies",
        heading: "5. Cookies y tecnologías",
        blocks: [
          {
            type: "paragraph",
            text: "Usamos cookies y almacenamiento local necesarios para autenticación (Clerk) y operación segura de la sesión. No usamos publicidad comportamental de terceros en la plataforma.",
          },
        ],
      },
      {
        id: "terceros",
        heading: "6. Encargados y transferencias",
        blocks: [
          {
            type: "bullets",
            items: [
              "Clerk (autenticación y organizaciones).",
              "Vercel (hosting) y Neon (base de datos).",
              "Proveedores de clima (Open-Meteo, NASA POWER, SENAMHI u otros según plan y contrato).",
              "Clerk Billing / Stripe para pagos cuando estén habilitados.",
            ],
          },
          {
            type: "paragraph",
            text: "Algunos proveedores pueden procesar datos en Estados Unidos u otros países. Las transferencias internacionales se realizan con las salvaguardas previstas en la Ley N.° 29733 y su reglamento, incluyendo contratos con encargados y medidas técnicas razonables.",
          },
        ],
      },
      {
        id: "derechos",
        heading: "7. Derechos del titular",
        blocks: [
          {
            type: "paragraph",
            text: `Usted puede acceder, rectificar, cancelar u oponerse al tratamiento, así como revocar consentimientos cuando aplique, escribiendo a ${LEGAL_CONTACT_EMAIL}. Responderemos en un plazo de hasta diez (10) días hábiles, prorrogable de forma justificada conforme a la normativa vigente.`,
          },
        ],
      },
      {
        id: "conservacion",
        heading: "8. Conservación y seguridad",
        blocks: [
          {
            type: "paragraph",
            text: "Conservamos los datos mientras exista la relación contractual o sea necesario para las finalidades descritas, y luego por los plazos legales aplicables.",
          },
          {
            type: "paragraph",
            text: "Aplicamos controles de acceso, cifrado en tránsito y prácticas de mínimo privilegio. Ningún sistema es 100 % seguro. Ante incidentes de seguridad relevantes, notificaremos conforme a la ley aplicable.",
          },
        ],
      },
    ],
  },
  refunds: {
    slug: "refunds",
    title: "Política de reembolsos",
    description: "Criterios de reembolso para suscripciones de Agro AI.",
    sections: [
      {
        id: "alcance",
        heading: "1. Alcance",
        blocks: [
          {
            type: "paragraph",
            text: "Esta política aplica a suscripciones de pago contratadas por una organización (workspace) en Agro AI a través de Clerk Billing.",
          },
          {
            type: "paragraph",
            text: "Los precios en la landing pública son referenciales hasta que se habilite cobro live en producción; ver Términos de suscripción.",
          },
        ],
      },
      {
        id: "trial",
        heading: "2. Período de prueba",
        blocks: [
          {
            type: "paragraph",
            text: "Los planes de pago pueden incluir un período de prueba gratuito indicado al suscribirse (p. ej. catorce (14) días en sandbox). Si cancela antes de que finalice el trial, no se realizará cobro por ese ciclo según las reglas de Clerk/Stripe.",
          },
        ],
      },
      {
        id: "reembolsos",
        heading: "3. Reembolsos",
        blocks: [
          {
            type: "bullets",
            items: [
              "Salvo obligación legal imperativa, las cuotas ya facturadas por un período en curso no son reembolsables de forma prorrateada.",
              "Evaluaremos reembolsos por cobro duplicado, error manifiesto de facturación o falla prolongada del servicio atribuible a Agro AI.",
              `Las solicitudes deben enviarse a ${LEGAL_CONTACT_EMAIL} dentro de los quince (15) días calendario del cargo, con identificación del workspace y comprobante.`,
            ],
          },
        ],
      },
      {
        id: "cancelacion",
        heading: "4. Cancelación",
        blocks: [
          {
            type: "paragraph",
            text: "Puede cancelar la renovación desde el portal de suscripción (Clerk) o contactando soporte. La cancelación evita cargos futuros; el acceso a funciones de pago continúa hasta el fin del período ya pagado salvo indicación contraria en el checkout.",
          },
        ],
      },
      {
        id: "sandbox",
        heading: "5. Entornos de prueba",
        blocks: [
          {
            type: "paragraph",
            text: "En staging (stg.geoagro.ai) y sandbox de Clerk Billing los cargos son de prueba. No aplican reembolsos reales en esos entornos.",
          },
        ],
      },
      {
        id: "contacto",
        heading: "6. Contacto",
        blocks: [
          {
            type: "paragraph",
            text: OPERATOR_LINE,
          },
        ],
      },
    ],
  },
  subscription: {
    slug: "subscription",
    title: "Términos de suscripción",
    description: "Condiciones de planes, facturación y cobro para workspaces.",
    sections: [
      {
        id: "planes",
        heading: "1. Planes y precios",
        blocks: [
          {
            type: "paragraph",
            text: "Los planes se contratan a nivel de organización (workspace). Los precios publicados en USD en la web pública son orientativos hasta habilitar cobro live; el precio vinculante es el mostrado en el checkout de Clerk al suscribirse.",
          },
          {
            type: "bullets",
            items: [
              "free_org (Básico / Weather Intelligence base): sin cargo de suscripción · hasta 2 miembros · entitlement weather.",
              "weather_plus (Profesional / Weather Intelligence Plus): USD 29/mes · hasta 5 miembros · weather + weather_plus.",
              "operations (Empresa / Operations): USD 79/mes · hasta 15 miembros · weather, weather_plus, traceability, agronomic_review.",
              "full: USD 99/mes · hasta 25 miembros · mismos entitlements que operations (alias comercial; no añade productos adicionales).",
            ],
          },
          {
            type: "paragraph",
            text: "En la landing pública, «Básico», «Profesional» y «Empresa» corresponden a los slugs anteriores. Los nombres comerciales pueden variar; prevalece el plan y precio del checkout.",
          },
        ],
      },
      {
        id: "facturacion",
        heading: "2. Facturación y renovación",
        blocks: [
          {
            type: "bullets",
            items: [
              "Ciclo mensual salvo que se indique otro período en el checkout.",
              "Renovación automática hasta cancelación.",
              "Período de prueba gratuito cuando se indique en checkout (p. ej. 14 días en sandbox).",
              "Impuestos aplicables (p. ej. IGV) se mostrarán o aplicarán según configuración de facturación y normativa vigente en Perú.",
              "Para clientes en Perú, las facturas electrónicas se emitirán con los datos de facturación del checkout cuando el cobro live esté habilitado.",
              "Los planes se facturan en USD salvo indicación distinta en checkout. El cliente es responsable de obligaciones tributarias locales derivadas del pago.",
              "El procesador de pago es Stripe a través de Clerk Billing.",
            ],
          },
        ],
      },
      {
        id: "miembros",
        heading: "3. Límites de miembros",
        blocks: [
          {
            type: "paragraph",
            text: "Cada plan incluye un tope de miembros activos más invitaciones pendientes (véase tabla en §1). Superar el tope requiere upgrade de plan o reducir miembros. Ver panel Admin → Miembros.",
          },
        ],
      },
      {
        id: "cambios-precio",
        heading: "4. Cambios de precio o plan",
        blocks: [
          {
            type: "paragraph",
            text: "Podemos actualizar precios o características de planes con aviso previo razonable (p. ej. treinta días) antes de que afecte una renovación. Si no acepta el cambio, puede cancelar antes de la fecha efectiva.",
          },
        ],
      },
      {
        id: "suspension",
        heading: "5. Suspensión por impago",
        blocks: [
          {
            type: "paragraph",
            text: "El impago o fallo en el método de pago puede limitar el acceso a funciones de pago tras un período de gracia razonable. Los datos del workspace se conservan conforme a la Política de privacidad.",
          },
        ],
      },
      {
        id: "live",
        heading: "6. Cobro live en Perú",
        blocks: [
          {
            type: "paragraph",
            text: "Hasta completar el checklist operativo y legal interno, el cobro live en geoagro.ai puede permanecer deshabilitado. El entorno de pruebas (stg) usa gateway de desarrollo sin cargo real en Perú.",
          },
          {
            type: "paragraph",
            text: "Al habilitar cobro live, estos términos regirán junto con los Términos de servicio y la Política de reembolsos.",
          },
        ],
      },
      {
        id: "contacto",
        heading: "7. Contacto",
        blocks: [
          {
            type: "paragraph",
            text: OPERATOR_LINE,
          },
        ],
      },
    ],
  },
};

export const LEGAL_SLUGS = Object.keys(LEGAL_DOCUMENTS);

export function getLegalDocument(slug: string): LegalDocument | undefined {
  return LEGAL_DOCUMENTS[slug];
}
