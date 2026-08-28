import type { LegalDocument } from "./types";

export const LEGAL_DOCUMENTS: Record<string, LegalDocument> = {
  terms: {
    slug: "terms",
    title: "Términos de servicio",
    description: "Condiciones generales de uso de la plataforma Agro AI.",
    sections: [
      {
        id: "aceptacion",
        heading: "1. Aceptación",
        paragraphs: [
          "Al acceder o usar Agro AI (geoagro.ai) usted acepta estos Términos. Si actúa en nombre de una organización, declara tener autoridad para vincularla.",
          "Si no está de acuerdo, no use el servicio.",
        ],
      },
      {
        id: "servicio",
        heading: "2. El servicio",
        paragraphs: [
          "Agro AI es una plataforma B2B de información agronómica por parcela (clima, trazabilidad piloto, revisión humana y funciones asociadas). El alcance depende del plan y entitlements activos en su workspace.",
          "Las salidas son informativas y de apoyo a la decisión. No sustituyen asesoría agronómica, legal ni regulatoria profesional.",
        ],
      },
      {
        id: "cuentas",
        heading: "3. Cuentas y workspaces",
        bullets: [
          "Debe proporcionar información veraz y mantener la seguridad de sus credenciales.",
          "Los administradores del workspace gestionan miembros, roles e invitaciones.",
          "Usted es responsable de la actividad bajo su cuenta y la de su organización.",
        ],
      },
      {
        id: "uso-permitido",
        heading: "4. Uso permitido",
        bullets: [
          "Usar el servicio conforme a la ley peruana aplicable y a estos Términos.",
          "No intentar acceder sin autorización, interferir con la plataforma ni extraer datos de forma masiva no permitida.",
          "No subir datos personales sensibles innecesarios ni contenido que infrinja derechos de terceros.",
        ],
      },
      {
        id: "propiedad",
        heading: "5. Propiedad intelectual y datos",
        paragraphs: [
          "Agro AI conserva los derechos sobre la plataforma, marca y software. Usted conserva los derechos sobre los datos que ingresa (parcelas, decisiones, etc.).",
          "Nos otorga una licencia limitada para procesar esos datos con el fin de prestar y mejorar el servicio, conforme a la Política de privacidad.",
        ],
      },
      {
        id: "disponibilidad",
        heading: "6. Disponibilidad y cambios",
        paragraphs: [
          "Podemos actualizar funciones, fuentes de datos (p. ej. Open-Meteo, NASA POWER, proveedores pagos) o retirar características en piloto con aviso razonable cuando sea posible.",
          "El entorno de staging (stg.geoagro.ai) es para pruebas; puede diferir de producción.",
        ],
      },
      {
        id: "limitacion",
        heading: "7. Limitación de responsabilidad",
        paragraphs: [
          "En la máxima medida permitida por la ley peruana, Agro AI no será responsable por daños indirectos, lucro cesante o decisiones tomadas exclusivamente con base en salidas del sistema.",
          "La responsabilidad total agregada por reclamos relacionados con el servicio se limita al monto pagado por su organización en los doce (12) meses anteriores al evento, o cero si no hubo pago.",
        ],
      },
      {
        id: "ley",
        heading: "8. Ley aplicable y contacto",
        paragraphs: [
          "Estos Términos se rigen por las leyes de la República del Perú. Las controversias se someterán a los tribunales de Lima, salvo norma imperativa distinta.",
          "Contacto: hola@geoagro.ai",
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
        paragraphs: [
          "Agro AI (geoagro.ai) es responsable del tratamiento de datos personales recogidos a través de la plataforma.",
          "Contacto de privacidad: hola@geoagro.ai",
        ],
      },
      {
        id: "datos",
        heading: "2. Datos que tratamos",
        bullets: [
          "Identificación y contacto: nombre, correo, organización (vía proveedor de autenticación Clerk).",
          "Datos de uso: logs técnicos, dirección IP, eventos de producto necesarios para operación y seguridad.",
          "Datos de workspace: parcelas, geometrías, decisiones de revisión, lotes de trazabilidad y metadatos asociados.",
          "Facturación: estado de suscripción y plan (procesado por Clerk Billing / Stripe cuando aplique); no almacenamos números completos de tarjeta.",
        ],
      },
      {
        id: "finalidades",
        heading: "3. Finalidades",
        bullets: [
          "Prestar el servicio, autenticar usuarios y administrar workspaces.",
          "Gestionar suscripciones y entitlements cuando el cliente contrate un plan de pago.",
          "Mejorar seguridad, soporte y calidad del producto.",
          "Cumplir obligaciones legales aplicables en Perú.",
        ],
      },
      {
        id: "base-legal",
        heading: "4. Base legal (Perú)",
        paragraphs: [
          "El tratamiento se basa en la ejecución del contrato o relación precontractual, el consentimiento cuando corresponda (p. ej. lista de espera), el interés legítimo en seguridad y mejora del servicio, y el cumplimiento de obligaciones legales, de conformidad con la Ley N.° 29733 y su reglamento.",
        ],
      },
      {
        id: "terceros",
        heading: "5. Encargados y transferencias",
        bullets: [
          "Clerk (autenticación y organizaciones).",
          "Vercel (hosting) y Neon (base de datos).",
          "Proveedores de clima (Open-Meteo, NASA POWER y otros según plan).",
          "Clerk Billing / Stripe para pagos cuando estén habilitados.",
        ],
        paragraphs: [
          "Algunos proveedores pueden procesar datos fuera del Perú. Adoptamos medidas contractuales y técnicas razonables para proteger la información.",
        ],
      },
      {
        id: "derechos",
        heading: "6. Derechos del titular",
        paragraphs: [
          "Usted puede acceder, rectificar, cancelar u oponerse al tratamiento, así como revocar consentimientos cuando aplique, escribiendo a hola@geoagro.ai. Responderemos en plazos razonables conforme a la normativa vigente.",
        ],
      },
      {
        id: "conservacion",
        heading: "7. Conservación y seguridad",
        paragraphs: [
          "Conservamos los datos mientras exista la relación contractual o sea necesario para las finalidades descritas, y luego por los plazos legales aplicables.",
          "Aplicamos controles de acceso, cifrado en tránsito y prácticas de mínimo privilegio. Ningún sistema es 100 % seguro.",
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
        paragraphs: [
          "Esta política aplica a suscripciones de pago contratadas por una organización (workspace) en Agro AI a través de Clerk Billing.",
          "Los precios en la landing pública son referenciales hasta que se habilite cobro live en producción; ver Términos de suscripción.",
        ],
      },
      {
        id: "trial",
        heading: "2. Período de prueba",
        paragraphs: [
          "Los planes de pago pueden incluir un período de prueba gratuito indicado al suscribirse. Si cancela antes de que finalice el trial, no se realizará cobro por ese ciclo.",
        ],
      },
      {
        id: "reembolsos",
        heading: "3. Reembolsos",
        bullets: [
          "Salvo obligación legal imperativa, las cuotas ya facturadas por un período en curso no son reembolsables de forma prorrateada.",
          "Evaluaremos reembolsos por cobro duplicado, error manifesto de facturación o falla prolongada del servicio atribuible a Agro AI.",
          "Las solicitudes deben enviarse a hola@geoagro.ai dentro de los quince (15) días calendario del cargo, con identificación del workspace y comprobante.",
        ],
      },
      {
        id: "cancelacion",
        heading: "4. Cancelación",
        paragraphs: [
          "Puede cancelar la renovación desde el portal de suscripción (Clerk) o contactando soporte. La cancelación evita cargos futuros; el acceso a funciones de pago continúa hasta el fin del período ya pagado salvo indicación contraria en el checkout.",
        ],
      },
      {
        id: "sandbox",
        heading: "5. Entornos de prueba",
        paragraphs: [
          "En staging (stg.geoagro.ai) y sandbox de Clerk Billing los cargos son de prueba. No aplican reembolsos reales en esos entornos.",
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
        paragraphs: [
          "Los planes se contratan a nivel de organización (workspace). Los precios publicados en USD son orientativos en la web pública hasta habilitar cobro live; el precio vinculante es el mostrado en el checkout de Clerk al suscribirse.",
        ],
        bullets: [
          "Free / base: clima esencial, límite de miembros según plan.",
          "Weather Intelligence Plus: funciones avanzadas de clima y agente.",
          "Operations / Full: productos adicionales (trazabilidad, revisión) según entitlements.",
        ],
      },
      {
        id: "facturacion",
        heading: "2. Facturación y renovación",
        bullets: [
          "Ciclo mensual salvo que se indique otro período en el checkout.",
          "Renovación automática hasta cancelación.",
          "Impuestos aplicables (p. ej. IGV) se mostrarán o aplicarán según configuración de facturación y normativa vigente.",
          "El procesador de pago es Stripe a través de Clerk Billing.",
        ],
      },
      {
        id: "miembros",
        heading: "3. Límites de miembros",
        paragraphs: [
          "Cada plan incluye un tope de miembros activos más invitaciones pendientes. Superar el tope requiere upgrade de plan o reducir miembros. Ver panel Admin → Miembros.",
        ],
      },
      {
        id: "cambios-precio",
        heading: "4. Cambios de precio o plan",
        paragraphs: [
          "Podemos actualizar precios o características de planes con aviso previo razonable (p. ej. treinta días) antes de que afecte una renovación. Si no acepta el cambio, puede cancelar antes de la fecha efectiva.",
        ],
      },
      {
        id: "suspension",
        heading: "5. Suspensión por impago",
        paragraphs: [
          "El impago o fallo en el método de pago puede limitar el acceso a funciones de pago tras un período de gracia razonable. Los datos del workspace se conservan conforme a la Política de privacidad.",
        ],
      },
      {
        id: "live",
        heading: "6. Cobro live en Perú",
        paragraphs: [
          "Hasta completar el checklist operativo y legal interno, el cobro live en geoagro.ai puede permanecer deshabilitado. El entorno de pruebas (stg) usa gateway de desarrollo sin cargo real en Perú.",
          "Al habilitar cobro live, estos términos regirán junto con los Términos de servicio y la Política de reembolsos.",
        ],
      },
    ],
  },
};

export const LEGAL_SLUGS = Object.keys(LEGAL_DOCUMENTS);

export function getLegalDocument(slug: string): LegalDocument | undefined {
  return LEGAL_DOCUMENTS[slug];
}
