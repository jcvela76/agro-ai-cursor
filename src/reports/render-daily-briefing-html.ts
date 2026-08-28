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
    if (trimmed.startsWith("- ") || /^\d+\.\s/.test(trimmed)) {
      if (!inList) {
        parts.push("<ul>");
        inList = true;
      }
      const text = trimmed.replace(/^\d+\.\s/, "").replace(/^- /, "");
      parts.push(`<li>${escapeHtml(text)}</li>`);
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
`;

export function renderDailyBriefingHtml(input: {
  title: string;
  parcelName: string;
  reportDay: string;
  summaryMarkdown: string;
  deltas: Array<{
    label: string;
    previousValue: string;
    currentValue: string;
    direction: string;
  }>;
  evidenceRows: Array<{ signal: string; value: string; source: string; validity: string }>;
  previousReportDay: string | null;
  generatedAt: string;
}): string {
  const deltaTable =
    input.deltas.length > 0
      ? `<table>
  <thead><tr><th>Señal</th><th>Ayer</th><th>Hoy</th><th>Tendencia</th></tr></thead>
  <tbody>
${input.deltas
  .map(
    (d) =>
      `    <tr><td>${escapeHtml(d.label)}</td><td>${escapeHtml(d.previousValue)}</td><td>${escapeHtml(d.currentValue)}</td><td>${escapeHtml(d.direction)}</td></tr>`,
  )
  .join("\n")}
  </tbody>
</table>`
      : `<p>Sin briefing previo${input.previousReportDay ? ` (último: ${escapeHtml(input.previousReportDay)})` : ""}.</p>`;

  const evidenceTable = `<table>
  <thead><tr><th>Señal</th><th>Valor</th><th>Fuente</th><th>Vigencia</th></tr></thead>
  <tbody>
${input.evidenceRows
  .map(
    (row) =>
      `    <tr><td>${escapeHtml(row.signal)}</td><td>${escapeHtml(row.value)}</td><td>${escapeHtml(row.source)}</td><td>${escapeHtml(row.validity)}</td></tr>`,
  )
  .join("\n")}
  </tbody>
</table>`;

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
    <p class="subtitle">${escapeHtml(input.reportDay)} · ${escapeHtml(input.parcelName)}</p>
  </header>
  <section>${markdownToSimpleHtml(input.summaryMarkdown)}</section>
  <section><h2>Tabla delta</h2>${deltaTable}</section>
  <section><h2>Evidencia consultada</h2>${evidenceTable}</section>
  <p class="limits">Orientación basada en evidencia (WQ-18). Decisión operativa: agrónomo.</p>
  <footer>Generado ${escapeHtml(input.generatedAt)} · America/Lima · Agro AI</footer>
</body>
</html>`;
}
