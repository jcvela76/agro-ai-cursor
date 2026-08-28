import { existsSync } from "node:fs";
import type { PdfRenderer } from "@/infrastructure/report/stub-pdf-renderer";
import { StubPdfRenderer } from "@/infrastructure/report/stub-pdf-renderer";

function resolveLocalChromePath(): string | null {
  if (process.env.CHROME_PATH?.trim()) {
    return process.env.CHROME_PATH.trim();
  }
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

async function renderWithPuppeteer(html: string, executablePath: string): Promise<Buffer> {
  const puppeteer = await import("puppeteer-core");
  const browser = await puppeteer.default.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    defaultViewport: { width: 794, height: 1123 },
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

class LocalChromePdfRenderer implements PdfRenderer {
  constructor(private readonly executablePath: string) {}

  async render(html: string): Promise<Buffer> {
    return renderWithPuppeteer(html, this.executablePath);
  }
}

class ServerlessChromiumPdfRenderer implements PdfRenderer {
  async render(html: string): Promise<Buffer> {
    const chromium = (await import("@sparticuz/chromium")).default;
    return renderWithPuppeteer(html, await chromium.executablePath());
  }
}

export function createPdfRenderer(): PdfRenderer {
  if (process.env.REPORT_PDF_MODE === "stub" || process.env.NODE_ENV === "test") {
    return new StubPdfRenderer();
  }

  if (process.env.VERCEL) {
    return new ServerlessChromiumPdfRenderer();
  }

  const chromePath = resolveLocalChromePath();
  if (chromePath) {
    return new LocalChromePdfRenderer(chromePath);
  }

  return new StubPdfRenderer();
}
