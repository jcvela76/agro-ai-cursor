import { describe, expect, it } from "vitest";
import {
  encodeGifFromRgbaFrames,
  normalizeGifFrames,
  resizeRgbaFrame,
  type GifRgbaFrame,
} from "@/domain/spectral/export-timeline-gif";

function solidFrame(width: number, height: number, r: number, g: number, b: number): GifRgbaFrame {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    const offset = i * 4;
    rgba[offset] = r;
    rgba[offset + 1] = g;
    rgba[offset + 2] = b;
    rgba[offset + 3] = 255;
  }
  return { width, height, rgba };
}

describe("export-timeline-gif", () => {
  it("resizeRgbaFrame scales dimensions", () => {
    const resized = resizeRgbaFrame(solidFrame(200, 100, 10, 20, 30), 100, 50);
    expect(resized.width).toBe(100);
    expect(resized.height).toBe(50);
    expect(resized.rgba.length).toBe(100 * 50 * 4);
  });

  it("normalizeGifFrames scales to target width", () => {
    const frames = normalizeGifFrames([solidFrame(200, 100, 10, 20, 30)], 100);
    expect(frames).toHaveLength(1);
    expect(frames[0]?.width).toBe(100);
    expect(frames[0]?.height).toBe(50);
  });

  it("encodeGifFromRgbaFrames returns GIF header bytes", async () => {
    const bytes = await encodeGifFromRgbaFrames(
      [solidFrame(40, 40, 255, 0, 0), solidFrame(40, 40, 0, 255, 0)],
      100,
    );
    expect(bytes[0]).toBe(0x47);
    expect(bytes[1]).toBe(0x49);
    expect(bytes[2]).toBe(0x46);
  });
});
