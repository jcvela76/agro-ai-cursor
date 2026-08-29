import { describe, expect, it, vi } from "vitest";
import { uploadFieldNotePhoto } from "@/infrastructure/field-note/upload-field-note-photo";

describe("uploadFieldNotePhoto", () => {
  it("rejects disallowed content types", async () => {
    const file = new File(["x"], "note.gif", { type: "image/gif" });
    const result = await uploadFieldNotePhoto({
      orgId: "org",
      parcelId: "parcel",
      file,
      putFn: vi.fn(),
    });
    expect(result.ok).toBe(false);
  });

  it("rejects oversized files", async () => {
    const big = new Uint8Array(4 * 1024 * 1024 + 1);
    const file = new File([big], "big.jpg", { type: "image/jpeg" });
    const result = await uploadFieldNotePhoto({
      orgId: "org",
      parcelId: "parcel",
      file,
      putFn: vi.fn(),
    });
    expect(result.ok).toBe(false);
  });

  it("uploads via putFn and returns url", async () => {
    const putFn = vi.fn().mockResolvedValue({
      url: "https://example.public.blob.vercel-storage.com/field-notes/x.jpg",
    });
    const file = new File(["abc"], "field.jpg", { type: "image/jpeg" });
    const result = await uploadFieldNotePhoto({
      orgId: "org_1",
      parcelId: "parcel_1",
      file,
      putFn,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.url).toContain("blob.vercel-storage.com");
    expect(result.data.contentType).toBe("image/jpeg");
    expect(putFn).toHaveBeenCalledOnce();
  });
});
