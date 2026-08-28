export interface PdfRenderer {
  render(html: string): Promise<Buffer>;
}

/** Minimal valid PDF for tests and offline smoke. */
export class StubPdfRenderer implements PdfRenderer {
  async render(_html: string): Promise<Buffer> {
    void _html;
    return Buffer.from(
      "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n",
      "utf8",
    );
  }
}
