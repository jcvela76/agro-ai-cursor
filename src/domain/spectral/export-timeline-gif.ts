import { SPECTRAL_TIMELINE_PLAY_MS } from "@/domain/spectral/timeline-scenes";

export const SPECTRAL_GIF_MAX_FRAMES = 15;
export const SPECTRAL_GIF_EXPORT_WIDTH = 360;

export type GifRgbaFrame = {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
};

export function resizeRgbaFrame(
  frame: GifRgbaFrame,
  targetWidth: number,
  targetHeight: number,
): GifRgbaFrame {
  const rgba = new Uint8ClampedArray(targetWidth * targetHeight * 4);
  for (let y = 0; y < targetHeight; y += 1) {
    const srcY = Math.min(frame.height - 1, Math.floor((y / targetHeight) * frame.height));
    for (let x = 0; x < targetWidth; x += 1) {
      const srcX = Math.min(frame.width - 1, Math.floor((x / targetWidth) * frame.width));
      const srcOffset = (srcY * frame.width + srcX) * 4;
      const dstOffset = (y * targetWidth + x) * 4;
      rgba[dstOffset] = frame.rgba[srcOffset]!;
      rgba[dstOffset + 1] = frame.rgba[srcOffset + 1]!;
      rgba[dstOffset + 2] = frame.rgba[srcOffset + 2]!;
      rgba[dstOffset + 3] = frame.rgba[srcOffset + 3]!;
    }
  }
  return { width: targetWidth, height: targetHeight, rgba };
}

/** Resize RGBA frames to a common width; height scales proportionally (even). */
export function normalizeGifFrames(
  frames: GifRgbaFrame[],
  targetWidth: number,
): GifRgbaFrame[] {
  if (frames.length === 0) {
    return [];
  }
  const first = frames[0]!;
  const targetHeight = Math.max(
    2,
    Math.round((first.height / first.width) * targetWidth / 2) * 2,
  );
  return frames.map((frame) => {
    if (frame.width === targetWidth && frame.height === targetHeight) {
      return frame;
    }
    return resizeRgbaFrame(frame, targetWidth, targetHeight);
  });
}

export async function loadRgbaFromDataUrl(dataUrl: string): Promise<GifRgbaFrame> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar un frame PNG."));
    img.src = dataUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("No se pudo leer el frame PNG.");
  }
  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return {
    width: canvas.width,
    height: canvas.height,
    rgba: imageData.data,
  };
}

export async function encodeGifFromRgbaFrames(
  frames: GifRgbaFrame[],
  frameDelayMs = SPECTRAL_TIMELINE_PLAY_MS,
): Promise<Uint8Array> {
  if (frames.length === 0) {
    throw new Error("Sin frames para exportar.");
  }
  const normalized = normalizeGifFrames(frames, SPECTRAL_GIF_EXPORT_WIDTH);
  const { GIFEncoder, quantize, applyPalette } = await import("gifenc");
  const gif = GIFEncoder();
  for (const frame of normalized) {
    const palette = quantize(frame.rgba, 256);
    const index = applyPalette(frame.rgba, palette);
    gif.writeFrame(index, frame.width, frame.height, {
      palette,
      delay: frameDelayMs,
    });
  }
  gif.finish();
  return gif.bytes();
}

export function downloadGif(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes], { type: "image/gif" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
