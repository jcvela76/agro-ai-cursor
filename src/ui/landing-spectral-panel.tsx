"use client";

import { useMemo } from "react";
import {
  landingDemoIndices,
  landingDemoSparklinePoints,
  landingDemoZones,
  LANDING_DEMO_PARCEL_DEMO_LINE,
  ndreVigorLabel,
  type LandingDemoScene,
} from "@/content/landing/spectral-demo";
import type { VegetationIndexId } from "@/domain/spectral/types";
import { colorForLegendValue, getSpectralLegend } from "@/domain/spectral/overlay-legends";
import { Badge } from "@/ui/badge";
import styles from "./spectral-panel.module.css";

function tierLabel(tier: "low" | "mid" | "high"): string {
  if (tier === "low") return "bajo";
  if (tier === "high") return "alto";
  return "medio";
}

function tierTone(tier: "low" | "mid" | "high"): "stale" | "fresh" | "unknown" {
  if (tier === "low") return "stale";
  if (tier === "high") return "fresh";
  return "unknown";
}

export function LandingSpectralPanel({
  scene,
  sceneIndex,
  scenes,
  selectedIndexId,
  overlayOpacity,
  overlayRendering = null,
  isPlaying,
  onIndexChange,
  onOpacityChange,
  onSceneIndexChange,
  onPlayingChange,
}: {
  scene: LandingDemoScene;
  sceneIndex: number;
  scenes: LandingDemoScene[];
  selectedIndexId: VegetationIndexId;
  overlayOpacity: number;
  overlayRendering?: "sentinel_raster" | "synthetic_grid" | null;
  isPlaying: boolean;
  onIndexChange: (indexId: VegetationIndexId) => void;
  onOpacityChange: (opacity: number) => void;
  onSceneIndexChange: (index: number) => void;
  onPlayingChange: (playing: boolean) => void;
}) {
  const indices = useMemo(() => landingDemoIndices(scene), [scene]);
  const zones = useMemo(
    () => landingDemoZones(scene, selectedIndexId),
    [scene, selectedIndexId],
  );
  const legend = getSpectralLegend(selectedIndexId);
  const activeReading = indices.find((index) => index.id === selectedIndexId);
  const parcelMean =
    zones.reduce((sum, zone) => sum + (zone.value ?? 0), 0) / Math.max(zones.length, 1);
  const sparkline = useMemo(
    () => landingDemoSparklinePoints(scenes, selectedIndexId),
    [scenes, selectedIndexId],
  );

  return (
    <div className={styles.content}>
      <p className={styles.intro}>
        {LANDING_DEMO_PARCEL_DEMO_LINE} — índices Sentinel-2 L2A con overlay CDSE de escenas
        del piloto.
      </p>
      <p className={styles.muted}>
        Escena {scene.acquisitionDate}
        <span className={styles.freshnessInline}>
          <Badge tone="fresh">actualizado</Badge>
        </span>
        {overlayRendering === "sentinel_raster" ? (
          <span className={styles.freshnessInline}>
            <Badge tone="fresh">PNG satélite</Badge>
          </span>
        ) : overlayRendering === "synthetic_grid" ? (
          <span className={styles.freshnessInline}>
            <Badge tone="stale">grilla indicativa</Badge>
          </span>
        ) : (
          <span className={styles.freshnessInline}>
            <Badge tone="unknown">overlay…</Badge>
          </span>
        )}
      </p>

      <div className={styles.indexGrid}>
        {indices.map((index) => (
          <button
            key={index.id}
            type="button"
            className={index.id === selectedIndexId ? styles.indexChipActive : styles.indexChip}
            onClick={() => onIndexChange(index.id)}
          >
            {index.label}
          </button>
        ))}
      </div>

      <div className={styles.legendBlock}>
        <p className={styles.legendTitle}>
          Leyenda {legend.minLabel === "Estrés" ? selectedIndexId.toUpperCase() : activeReading?.label}
        </p>
        <div className={styles.legendBar}>
          {legend.stops.map((stop) => (
            <span
              key={stop.value}
              className={styles.legendStop}
              style={{ backgroundColor: stop.color }}
            />
          ))}
        </div>
        <div className={styles.legendLabels}>
          <span>
            {legend.min} {legend.minLabel}
          </span>
          <span>
            {legend.max}+ {legend.maxLabel}
          </span>
        </div>
        {selectedIndexId === "ndwi" || selectedIndexId === "ndmi" ? (
          <p className={styles.muted}>Agua en vegetación — no humedad de suelo.</p>
        ) : null}
      </div>

      <label className={styles.opacityField}>
        <span>Opacidad overlay ({Math.round(overlayOpacity * 100)}%)</span>
        <input
          type="range"
          min={0.2}
          max={1}
          step={0.02}
          value={overlayOpacity}
          onChange={(event) => onOpacityChange(Number(event.target.value))}
        />
      </label>

      <ul className={styles.compactList}>
        {indices.map((index) => {
          const barColor =
            index.value === null
              ? "var(--color-border-subtle)"
              : colorForLegendValue(index.value, getSpectralLegend(index.id));
          return (
            <li key={index.id} className={styles.compactRow}>
              <span className={styles.compactLabel}>{index.label}</span>
              <div className={styles.compactTrack}>
                <span
                  className={styles.compactFill}
                  style={{
                    width: `${index.value === null ? 0 : Math.min(100, Math.max(4, ((index.value + 1) / 2) * 100))}%`,
                    backgroundColor: barColor,
                  }}
                />
              </div>
              <span className={styles.compactValue}>
                {index.value === null ? "—" : index.value.toFixed(2)}
              </span>
            </li>
          );
        })}
      </ul>

      <div className={styles.zonesBlock}>
        <p className={styles.legendTitle}>Zonas · {selectedIndexId.toUpperCase()}</p>
        <ul className={styles.zoneList}>
          {zones.map((zone) => (
            <li key={zone.id}>
              <div className={styles.zoneRow}>
                <span className={styles.zoneLabel}>{zone.label}</span>
                <Badge tone={tierTone(zone.tier)}>{tierLabel(zone.tier)}</Badge>
                <span className={styles.zoneMeta}>{Math.round(zone.areaShare * 100)}%</span>
                <span className={styles.zoneValue}>
                  {zone.value === null ? "—" : zone.value.toFixed(2)}
                </span>
              </div>
            </li>
          ))}
        </ul>
        <p className={styles.zoneHint}>
          Media parcela {parcelMean.toFixed(2)} · tiers relativos (no umbrales agronómicos absolutos)
        </p>
      </div>

      <div className={styles.historyBlock}>
        <p className={styles.legendTitle}>Historial · {selectedIndexId.toUpperCase()}</p>
        <div className={styles.mapSceneBanner}>
          <span>Mapa: {scene.acquisitionDate} (histórico)</span>
        </div>

        {sparkline.points ? (
          <svg
            className={styles.sparkline}
            viewBox="0 0 120 28"
            role="img"
            aria-label={`Tendencia ${selectedIndexId}`}
          >
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              points={sparkline.points}
            />
          </svg>
        ) : null}

        <div className={styles.timelineBlock}>
          <div className={styles.timelineControls}>
            <button
              type="button"
              className={styles.timelinePlayButton}
              onClick={() => onPlayingChange(!isPlaying)}
              aria-pressed={isPlaying}
            >
              {isPlaying ? "Pausa" : "Play"}
            </button>
            <input
              type="range"
              className={styles.timelineSlider}
              min={0}
              max={scenes.length - 1}
              step={1}
              value={sceneIndex}
              onChange={(event) => {
                onPlayingChange(false);
                onSceneIndexChange(Number(event.target.value));
              }}
              aria-label="Línea de tiempo de capturas"
            />
          </div>
          <div className={styles.timelineLabels}>
            <span>{scenes[0].acquisitionDate}</span>
            <span>{scenes[scenes.length - 1].acquisitionDate}</span>
          </div>
          <p className={styles.timelineCurrent}>
            {scene.acquisitionDate} · {selectedIndexId.toUpperCase()}{" "}
            {activeReading?.value?.toFixed(2) ?? "—"} ·{" "}
            {activeReading?.value != null ? ndreVigorLabel(activeReading.value) : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
