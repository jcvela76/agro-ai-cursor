"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/ui/button";
import { StateBanner } from "@/ui/state-banner";
import styles from "./report-export-action.module.css";

type QuotaBucket = {
  limit: number;
  used: number;
  remaining: number;
};

type DailyBriefingStatus = {
  reportDay: string;
  alreadyGenerated: boolean;
  existingReportId: string | null;
  previewUrl: string | null;
};

type Quota = {
  point: QuotaBucket;
  daily: QuotaBucket;
  billingMonth: string;
  planSlug: string;
  plusEnabled: boolean;
  dailyBriefing?: DailyBriefingStatus;
};

export function DailyBriefingAction({
  parcelId,
  isAdmin,
  disabled,
}: {
  parcelId: string;
  isAdmin: boolean;
  disabled?: boolean;
}) {
  const [quota, setQuota] = useState<Quota | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQuota = useCallback(async () => {
    try {
      const res = await fetch(`/api/reports/quota?parcelId=${encodeURIComponent(parcelId)}`);
      const json = (await res.json()) as { status: string; data?: Quota };
      if (json.status === "OK" && json.data) {
        setQuota(json.data);
      }
    } catch {
      setQuota(null);
    }
  }, [parcelId]);

  useEffect(() => {
    void loadQuota();
  }, [loadQuota]);

  const onGenerate = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: "daily_briefing",
          parcelId,
        }),
      });
      let json: {
        status: string;
        message?: string;
        previewUrl?: string;
        data?: { previewUrl: string; quota: Quota };
      };
      try {
        json = (await res.json()) as typeof json;
      } catch {
        setError(`Error del servidor (${res.status}). Reintenta o revisa los logs.`);
        return;
      }
      if (!res.ok || json.status !== "OK" || !json.data) {
        if (res.status === 409 && json.previewUrl) {
          window.open(json.previewUrl, "_blank", "noopener,noreferrer");
        }
        setError(json.message ?? "No se pudo generar el briefing diario.");
        await loadQuota();
        return;
      }
      setQuota(json.data.quota);
      window.open(json.data.previewUrl, "_blank", "noopener,noreferrer");
    } catch {
      setError("Error de red al generar briefing.");
    } finally {
      setBusy(false);
    }
  };

  if (quota === null) {
    return <p className={styles.muted}>Briefing diario…</p>;
  }

  if (!quota.plusEnabled) {
    return (
      <div className={styles.block}>
        <StateBanner
          title="Briefing diario requiere Weather Intelligence Plus"
          detail="Un resumen diario por parcela con delta vs el día anterior y evidencia consultada."
          tone="unavailable"
        />
        {isAdmin ? (
          <Link className={styles.billingLink} href="/app/billing">
            Subir a Plus →
          </Link>
        ) : (
          <p className={styles.muted}>Pide a un admin que active Plus en billing.</p>
        )}
      </div>
    );
  }

  const daily = quota.daily;
  const briefing = quota.dailyBriefing;

  if (briefing?.alreadyGenerated && briefing.previewUrl) {
    return (
      <div className={styles.block}>
        <StateBanner
          title="Briefing de hoy ya generado"
          detail={`${briefing.reportDay} · abre el informe o vuelve mañana para uno nuevo.`}
          tone="stale"
        />
        <Link className={styles.billingLink} href={briefing.previewUrl} target="_blank" rel="noopener noreferrer">
          Ver briefing de hoy →
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.block}>
      <div className={styles.row}>
        <Button
          type="button"
          onClick={() => void onGenerate()}
          disabled={busy || disabled || daily.remaining <= 0}
        >
          {busy ? "Generando…" : "Generar briefing diario (PDF)"}
        </Button>
        <span className={styles.quota}>
          {daily.used}/{daily.limit} briefings · {quota.billingMonth}
        </span>
      </div>
      {daily.remaining <= 0 ? (
        <StateBanner
          title="Cuota mensual de briefings agotada"
          detail={`Plan ${quota.planSlug}: ${daily.limit} briefings/mes.`}
          tone="stale"
        />
      ) : null}
      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
