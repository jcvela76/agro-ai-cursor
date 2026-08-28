import { describe, expect, it } from "vitest";
import { getLegalDocument, LEGAL_DOCUMENTS, LEGAL_SLUGS } from "@/content/legal/documents";
import { LEGAL_NAV_LINKS } from "@/content/legal/types";

describe("legal documents", () => {
  it("defines all four public slugs", () => {
    expect(LEGAL_SLUGS.sort()).toEqual(["privacy", "refunds", "subscription", "terms"]);
  });

  it("nav links stay in sync with document slugs", () => {
    expect(LEGAL_NAV_LINKS.map((l) => l.slug).sort()).toEqual(LEGAL_SLUGS.sort());
    expect(LEGAL_NAV_LINKS.every((l) => l.href === `/legal/${l.slug}`)).toBe(true);
  });

  it("each document slug matches record key and has blocks with content", () => {
    for (const slug of LEGAL_SLUGS) {
      const doc = getLegalDocument(slug);
      expect(doc).toBeDefined();
      expect(doc!.slug).toBe(slug);
      expect(doc!.sections.length).toBeGreaterThanOrEqual(4);

      const sectionIds = doc!.sections.map((s) => s.id);
      expect(new Set(sectionIds).size).toBe(sectionIds.length);

      for (const section of doc!.sections) {
        expect(section.blocks.length).toBeGreaterThan(0);
        for (const block of section.blocks) {
          if (block.type === "paragraph") {
            expect(block.text.trim().length).toBeGreaterThan(0);
          } else {
            expect(block.items.length).toBeGreaterThan(0);
            for (const item of block.items) {
              expect(item.trim().length).toBeGreaterThan(0);
            }
          }
        }
      }
    }
  });

  it("matches LEGAL_DOCUMENTS record keys", () => {
    expect(Object.keys(LEGAL_DOCUMENTS).sort()).toEqual(LEGAL_SLUGS.sort());
  });

  it("privacy terceros section lists encargados before transfer paragraph", () => {
    const terceros = getLegalDocument("privacy")!.sections.find((s) => s.id === "terceros");
    expect(terceros).toBeDefined();
    expect(terceros!.blocks[0]?.type).toBe("bullets");
    expect(terceros!.blocks[1]?.type).toBe("paragraph");
  });

  it("refunds and subscription include operator contact section", () => {
    for (const slug of ["refunds", "subscription"] as const) {
      const contacto = getLegalDocument(slug)!.sections.find((s) => s.id === "contacto");
      expect(contacto).toBeDefined();
      expect(contacto!.blocks[0]?.type).toBe("paragraph");
    }
  });
});
