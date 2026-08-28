import { describe, expect, it } from "vitest";
import { getLegalDocument, LEGAL_DOCUMENTS, LEGAL_SLUGS } from "@/content/legal/documents";

describe("legal documents", () => {
  it("defines all four public slugs", () => {
    expect(LEGAL_SLUGS.sort()).toEqual(["privacy", "refunds", "subscription", "terms"]);
  });

  it("each document has sections with content", () => {
    for (const slug of LEGAL_SLUGS) {
      const doc = getLegalDocument(slug);
      expect(doc).toBeDefined();
      expect(doc!.sections.length).toBeGreaterThanOrEqual(4);
      for (const section of doc!.sections) {
        const hasText =
          (section.paragraphs?.length ?? 0) > 0 || (section.bullets?.length ?? 0) > 0;
        expect(hasText).toBe(true);
      }
    }
  });

  it("matches LEGAL_DOCUMENTS record keys", () => {
    expect(Object.keys(LEGAL_DOCUMENTS).sort()).toEqual(LEGAL_SLUGS.sort());
  });
});
