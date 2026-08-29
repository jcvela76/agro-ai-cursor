/**
 * Smoke — spectral visual history (timeline, dual A/B PNG hints, GIF export).
 *
 * Usage:
 *   npm run smoke:spectral-visual-history
 */
import { compareSpectralScenes, sceneMeansFromRecord } from "../src/domain/spectral/compare-scenes";
import {
  encodeGifFromRgbaFrames,
  normalizeGifFrames,
  resizeRgbaFrame,
  SPECTRAL_GIF_MAX_FRAMES,
  type GifRgbaFrame,
} from "../src/domain/spectral/export-timeline-gif";
import type { SpectralSceneRecord } from "../src/domain/spectral/scene-history";
import {
  indexOfScene,
  sceneAtIndex,
  sortScenesAsc,
  SPECTRAL_TIMELINE_PLAY_MS,
} from "../src/domain/spectral/timeline-scenes";
import { GetParcelSpectralOverlay } from "../src/application/spectral/get-parcel-spectral-overlay";
import { defaultSyntheticSnapshots } from "../src/infrastructure/auth/synthetic-access-resolver";
import { SyntheticParcelRegistry } from "../src/infrastructure/parcel/synthetic-parcel-registry";
import { OfflineSpectralSource } from "../src/infrastructure/spectral/offline-spectral-source";

const parcelId = "parcel-lima-norte-001";
const weatherPlus = defaultSyntheticSnapshots.find((s) => s.userId === "user-plus-005")!;

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    throw new Error(msg);
  }
}

function solidFrame(width: number, height: number, r: number): GifRgbaFrame {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i += 1) {
    const offset = i * 4;
    rgba[offset] = r;
    rgba[offset + 1] = r;
    rgba[offset + 2] = r;
    rgba[offset + 3] = 255;
  }
  return { width, height, rgba };
}

function sceneFixture(
  id: string,
  acquisitionDate: string,
  acquiredAt: string,
  ndre: number,
): SpectralSceneRecord {
  return {
    id,
    orgId: "org_lima_coffee",
    parcelId,
    acquisitionDate,
    acquiredAt,
    sourceId: "offline-sentinel-2-synthetic",
    sourceLabel: "Offline",
    indices: [
      { id: "ndre", value: ndre },
      { id: "evi", value: ndre + 0.1 },
    ],
    evidence: {
      sourceId: "offline-sentinel-2-synthetic",
      sourceLabel: "Offline",
      acquiredAt,
      timezone: "America/Lima",
      spatialScope: {
        kind: "point",
        latitude: -11.95,
        longitude: -77.05,
        label: parcelId,
      },
      freshnessStatus: acquisitionDate >= "2026-08-20" ? "fresh" : "stale",
      freshnessPolicy: "smoke",
    },
    createdAt: acquiredAt,
    updatedAt: acquiredAt,
  };
}

function displaySceneBadge(
  timelineScene: SpectralSceneRecord | null,
  liveAcquisitionDate: string,
  liveFreshness: string,
) {
  return {
    acquisitionDate: timelineScene?.acquisitionDate ?? liveAcquisitionDate,
    freshnessStatus:
      timelineScene?.evidence.freshnessStatus ?? liveFreshness,
  };
}

function dualOverlayOpacities(opacity: number, blend: number) {
  const base = opacity * 0.85;
  const clampedBlend = Math.min(1, Math.max(0, blend));
  return {
    earlier: base * (1 - clampedBlend),
    later: base * clampedBlend,
  };
}

async function main() {
  const steps: string[] = [];

  const scenes = sortScenesAsc([
    sceneFixture("s3", "2026-08-27", "2026-08-27T00:00:00Z", 0.02),
    sceneFixture("s1", "2026-08-04", "2026-08-04T00:00:00Z", -0.01),
    sceneFixture("s2", "2026-08-12", "2026-08-12T00:00:00Z", 0.0),
  ]);
  assert(scenes.map((s) => s.id).join(",") === "s1,s2,s3", "timeline sort");
  assert(indexOfScene(scenes, "s2") === 1, "timeline indexOfScene");
  assert(sceneAtIndex(scenes, 0)?.id === "s1", "timeline sceneAtIndex");
  steps.push(`timeline ${scenes.length} scenes`);

  const compare = compareSpectralScenes(scenes[0]!, scenes[2]!, ["ndre", "evi"]);
  assert(compare.earlier.id === "s1", "compare earlier");
  assert(compare.later.id === "s3", "compare later");
  assert(compare.byIndex[0]?.delta === 0.03, "compare ndre delta");
  const earlierHint = {
    acquiredAt: compare.earlier.acquiredAt,
    means: sceneMeansFromRecord(compare.earlier),
  };
  const laterHint = {
    acquiredAt: compare.later.acquiredAt,
    means: sceneMeansFromRecord(compare.later),
  };
  assert(earlierHint.means.ndre === -0.01, "compare earlier means");
  assert(laterHint.means.ndre === 0.02, "compare later means");
  steps.push("compare A/B hints");

  const opacities = dualOverlayOpacities(0.62, 0.5);
  assert(Math.abs(opacities.earlier - opacities.later) < 0.001, "dual blend symmetric");
  assert(opacities.earlier > 0 && opacities.later > 0, "dual opacities positive");
  steps.push("dual overlay opacities");

  const liveDate = "2026-08-29";
  const badgeLive = displaySceneBadge(null, liveDate, "fresh");
  assert(badgeLive.acquisitionDate === liveDate, "badge live date");
  const badgeHist = displaySceneBadge(scenes[2]!, liveDate, "fresh");
  assert(badgeHist.acquisitionDate === "2026-08-27", "badge timeline date");
  assert(badgeHist.freshnessStatus === "fresh", "badge timeline freshness");
  steps.push("badge sync");

  const resized = resizeRgbaFrame(solidFrame(80, 40, 10), 40, 20);
  assert(resized.width === 40 && resized.height === 20, "gif resize");
  const normalized = normalizeGifFrames(
    [solidFrame(100, 50, 20), solidFrame(200, 100, 40)],
    120,
  );
  assert(normalized[0]?.width === 120, "gif normalize width");
  const gifBytes = await encodeGifFromRgbaFrames(
    [solidFrame(32, 32, 200), solidFrame(32, 32, 80)],
    SPECTRAL_TIMELINE_PLAY_MS,
  );
  assert(gifBytes[0] === 0x47 && gifBytes[1] === 0x49 && gifBytes[2] === 0x46, "gif header");
  assert(gifBytes.length > 100, "gif non-empty");
  steps.push(`gif encode ${gifBytes.length} bytes`);

  const exportSlice = scenes.slice(-SPECTRAL_GIF_MAX_FRAMES);
  assert(exportSlice.length === scenes.length, "gif frame cap not hit");
  assert(exportSlice[exportSlice.length - 1]?.id === "s3", "gif export newest last");
  steps.push(`gif cap ${SPECTRAL_GIF_MAX_FRAMES}`);

  const parcels = new SyntheticParcelRegistry();
  const source = new OfflineSpectralSource();
  const overlay = new GetParcelSpectralOverlay(parcels, source);
  const [ovA, ovB] = await Promise.all([
    overlay.execute({
      authority: weatherPlus,
      parcelId,
      indexId: "ndre",
      acquiredAt: earlierHint.acquiredAt,
      parcelMean: earlierHint.means.ndre ?? null,
    }),
    overlay.execute({
      authority: weatherPlus,
      parcelId,
      indexId: "ndre",
      acquiredAt: laterHint.acquiredAt,
      parcelMean: laterHint.means.ndre ?? null,
    }),
  ]);
  assert(ovA.ok && ovB.ok, "dual overlay fetch offline");
  assert(ovA.data.rendering === "synthetic_grid", "dual overlay A rendering");
  assert(ovB.data.rendering === "synthetic_grid", "dual overlay B rendering");
  steps.push("dual overlay API offline");

  console.log(`PASS smoke:spectral-visual-history — ${steps.join(" · ")}`);
}

main().catch((error) => {
  console.error("FAIL smoke:spectral-visual-history", error);
  process.exit(1);
});
