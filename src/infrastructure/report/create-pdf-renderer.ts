import { StubPdfRenderer, type PdfRenderer } from "@/infrastructure/report/stub-pdf-renderer";

export function createPdfRenderer(): PdfRenderer {
  if (process.env.REPORT_PDF_MODE === "stub" || process.env.NODE_ENV === "test") {
    return new StubPdfRenderer();
  }

  return new PuppeteerPdfRenderer();
}

class PuppeteerPdfRenderer implements PdfRenderer {
  async render(html: string): Promise<Buffer> {
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteer = await import("puppeteer-core");

    const browser = await puppeteer.default.launch({
      args: chromium.args,
      defaultViewport: { width: 794, height: 1123 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "load" });
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "16mm", right: "14mm", bottom: "16mm", left: "14mm" },
      });
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }
}
