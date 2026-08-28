function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function markdownToSimpleHtml(markdown: string): string {
  const lines = markdown.split("\n");
  const parts: string[] = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inList) {
        parts.push("</ul>");
        inList = false;
      }
      continue;
    }
    if (trimmed.startsWith("## ")) {
      if (inList) {
        parts.push("</ul>");
        inList = false;
      }
      parts.push(`<h2>${escapeHtml(trimmed.slice(3))}</h2>`);
      continue;
    }
    if (trimmed.startsWith("- ")) {
      if (!inList) {
        parts.push("<ul>");
        inList = true;
      }
      parts.push(`<li>${escapeHtml(trimmed.slice(2))}</li>`);
      continue;
    }
    if (inList) {
      parts.push("</ul>");
      inList = false;
    }
    parts.push(`<p>${escapeHtml(trimmed)}</p>`);
  }
  if (inList) {
    parts.push("</ul>");
  }
  return parts.join("\n");
}

export interface ReportHtmlInput {
  title: string;
  subtitle: string;
  summaryHtml: string;
  evidenceRows: Array<{ signal: string; value: string; source: string; validity: string }>;
  limitsHtml?: string;
  generatedAt: string;
  parcelName?: string;
}

const BASE_STYLES = `
  body { font-family: system-ui, sans-serif; color: #1c2a1f; font-size: 12px; line-height: 1.45; margin: 0; }
  header { border-bottom: 2px solid #2d6a4f; padding-bottom: 12px; margin-bottom: 16px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .subtitle { color: #5c6b5f; margin: 0; }
  h2 { font-size: 14px; margin: 16px 0 8px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 11px; }
  th, td { border: 1px solid #d8e2dc; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f1f5f2; }
  .limits { color: #5c6b5f; font-size: 11px; margin-top: 12px; }
  footer { margin-top: 24px; padding-top: 8px; border-top: 1px solid #d8e2dc; font-size: 10px; color: #5c6b5f; }
  ul { margin: 8px 0; padding-left: 18px; }
  p { margin: 8px 0; }
`;

export function renderReportHtml(input: ReportHtmlInput): string {
  const evidenceTable =
    input.evidenceRows.length > 0
      ? `<table>
  <thead><tr><th>Señal</th><th>Valor</th><th>Fuente</th><th>Vigencia</th></tr></thead>
  <tbody>
${input.evidenceRows
  .map(
    (row) =>
      `    <tr><td>${escapeHtml(row.signal)}</td><td>${escapeHtml(row.value)}</td><td>${escapeHtml(row.source)}</td><td>${escapeHtml(row.validity)}</td></tr>`,
  )
  .join("\n")}
  </tbody>
</table>`
      : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(input.title)}</title>
  <style>${BASE_STYLES}</style>
</head>
<body>
  <header>
    <h1>${escapeHtml(input.title)}</h1>
    <p class="subtitle">${escapeHtml(input.subtitle)}${input.parcelName ? ` · ${escapeHtml(input.parcelName)}` : ""}</p>
  </header>
  <section>${input.summaryHtml}</section>
  ${evidenceTable ? `<section><h2>Evidencia consultada</h2>${evidenceTable}</section>` : ""}
  ${input.limitsHtml ? `<p class="limits">${input.limitsHtml}</p>` : ""}
  <footer>Generado ${escapeHtml(input.generatedAt)} · America/Lima · Agro AI</footer>
</body>
</html>`;
}

export function renderAgentBriefingHtml(input: {
  title: string;
  parcelName: string;
  question: string;
  answerMarkdown: string;
  generatedAt: string;
}): string {
  return renderReportHtml({
    title: input.title,
    subtitle: "Briefing Agro Agent",
    parcelName: input.parcelName,
    summaryHtml: `<h2>Pregunta</h2><p>${escapeHtml(input.question)}</p><h2>Respuesta</h2>${markdownToSimpleHtml(input.answerMarkdown)}`,
    evidenceRows: [],
    limitsHtml:
      "Orientación basada en evidencia (WQ-18). Decisión operativa: agrónomo.",
    generatedAt: input.generatedAt,
  });
}
