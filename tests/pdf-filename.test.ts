import { describe, expect, it } from "vitest";
import { contentDispositionHeader, sanitizePdfFilename } from "@/lib/pdf-filename";

describe("sanitizePdfFilename", () => {
  it("strips unicode separators from titles", () => {
    expect(sanitizePdfFilename("Hídrico · Lima Norte")).toBe("hidrico-lima-norte.pdf");
  });

  it("produces ASCII Content-Disposition", () => {
    const header = contentDispositionHeader("Clima · Demo");
    expect(header).toMatch(/^attachment; filename="[ -~]+"$/);
  });
});
