"use client";

import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Parcel } from "@/domain/parcel/types";
import { WeatherPanel } from "@/ui/weather-panel";
import styles from "./app-shell.module.css";

const STYLE_URL = "https://demotiles.maplibre.org/style.json";

export function AppShell({
  initialParcelId,
}: {
  initialParcelId: string | null;
}) {
  const router = useRouter();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);

  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initialParcelId);

  const selectParcel = useCallback(
    (parcelId: string | null) => {
      setSelectedId(parcelId);
      const url = parcelId ? `/app?parcel=${encodeURIComponent(parcelId)}` : "/app";
      router.replace(url, { scroll: false });
    },
    [router],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/parcels");
        const json = (await res.json()) as {
          status: string;
          data?: Parcel[];
          message?: string;
        };
        if (!res.ok || json.status !== "OK" || !json.data) {
          if (!cancelled) {
            setListError(json.message ?? "No se pudieron cargar las parcelas");
          }
          return;
        }
        if (!cancelled) {
          setParcels(json.data);
          setListError(null);
        }
      } catch {
        if (!cancelled) {
          setListError("No se pudieron cargar las parcelas");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = new MapLibreMap({
      container: mapContainerRef.current,
      style: STYLE_URL,
      center: [-77.05, -11.95],
      zoom: 8,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "bottom-right");
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    for (const parcel of parcels) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = styles.marker;
      el.setAttribute("aria-label", parcel.name);
      el.addEventListener("click", (event) => {
        event.stopPropagation();
        selectParcel(parcel.id);
      });

      const marker = new Marker({ element: el })
        .setLngLat([parcel.longitude, parcel.latitude])
        .addTo(map);
      markersRef.current.push(marker);
    }

    if (parcels.length === 1) {
      map.flyTo({
        center: [parcels[0].longitude, parcels[0].latitude],
        zoom: 10,
        essential: true,
      });
    } else if (parcels.length > 1) {
      const bounds = new LngLatBounds();
      for (const p of parcels) {
        bounds.extend([p.longitude, p.latitude]);
      }
      map.fitBounds(bounds, { padding: 80, maxZoom: 11 });
    }
  }, [parcels, selectParcel]);

  const selected = parcels.find((p) => p.id === selectedId) ?? null;

  return (
    <div className={styles.shell}>
      <div ref={mapContainerRef} className={styles.map} />

      <header className={styles.chrome}>
        <p className={styles.brand}>Agro AI</p>
        <div className={styles.chromeRight}>
          <OrganizationSwitcher
            hidePersonal
            afterSelectOrganizationUrl="/app"
            appearance={{
              elements: {
                rootBox: styles.orgSwitcher,
              },
            }}
          />
          <UserButton />
        </div>
      </header>

      {listError ? (
        <div className={styles.toast} role="alert">
          {listError}
        </div>
      ) : null}

      {selected ? (
        <div className={styles.panelSlot}>
          <WeatherPanel parcel={selected} onClose={() => selectParcel(null)} />
        </div>
      ) : (
        <div className={styles.hint}>
          {parcels.length === 0 && !listError
            ? "No hay parcelas en este workspace"
            : "Selecciona una parcela en el mapa"}
        </div>
      )}
    </div>
  );
}
