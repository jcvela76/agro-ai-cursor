declare module "gifenc" {
  type RgbaBytes = Uint8Array | Uint8ClampedArray;

  export function GIFEncoder(): {
    writeFrame: (
      index: RgbaBytes,
      width: number,
      height: number,
      opts?: { palette?: number[][]; delay?: number },
    ) => void;
    finish: () => void;
    bytes: () => Uint8Array;
  };
  export function quantize(rgba: RgbaBytes, maxColors: number): number[][];
  export function applyPalette(rgba: RgbaBytes, palette: number[][]): Uint8Array;
}
