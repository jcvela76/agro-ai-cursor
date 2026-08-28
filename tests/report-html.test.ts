import { describe, expect, it } from "vitest";
import { renderReportHtml } from "@/reports/render-report-html";

describe("renderReportHtml", () => {
  it("includes evidence table and footer", () => {
    const html = renderReportHtml({
      title: "Test",
      subtitle: "Parcela demo",
      summaryHtml: "<p>Resumen</p>",
      evidenceRows: [
        { signal: "Temp", value: "20 °C", source: "NASA", validity: "2026-08-25" },
      ],
      generatedAt: "28 ago 2026",
      parcelName: "Demo",
    });
    expect(html).toContain("<table>");
    expect(html).toContain("Temp");
    expect(html).toContain("Agro AI");
  });
});
