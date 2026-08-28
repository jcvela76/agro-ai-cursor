import { describe, expect, it } from "vitest";
import {
  contentDispositionHeader,
  reportDateStamp,
  sanitizePdfFilename,
} from "@/lib/pdf-filename";

describe("sanitizePdfFilename", () => {
  it("strips unicode separators and appends Lima date", () => {
    expect(sanitizePdfFilename("Hídrico · Lima Norte", "2026-08-28T21:00:00.000Z")).toBe(
      "hidrico-lima-norte-2026-08-28.pdf",
    );
  });

  it("produces ASCII Content-Disposition with date", () => {
    const header = contentDispositionHeader("Clima · Demo", {
      createdAt: "2026-08-28T12:00:00.000Z",
    });
    expect(header).toMatch(/^attachment; filename="[ -~]+"$/);
    expect(header).toContain("2026-08-28");
  });

  it("formats reportDateStamp in America/Lima", () => {
    expect(reportDateStamp("2026-08-28T12:00:00.000Z")).toBe("2026-08-28");
  });
});
