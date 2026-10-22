"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReportType } from "@/domain/report/types";
import { REPORT_TYPE_LABELS } from "@/domain/report/types";
import { Button } from "@/ui/button";
import { PlanFeatureUpsell } from "@/ui/plan-feature-upsell";
import { StateBanner } from "@/ui/state-banner";
import styles from "./report-export-action.module.css";

type QuotaBucket = {
  limit: number;
  used: number;
  remaining: number;
};

type Quota = {
  point: QuotaBucket;
  daily: QuotaBucket;
  billingMonth: string;
  planSlug: string;
  plusEnabled: boolean;
};

export function ReportExportAction({
  reportType,
  label,
  parcelId,
  lotId,
  agentQuestion,
  agentAnswerMarkdown,
  isAdmin,
  disabled,
}: {
  reportType: Exclude<ReportType, "daily_briefing">;
  label?: string;
  parcelId?: string;
  lotId?: string;
  agentQuestion?: string;
  agentAnswerMarkdown?: string;
  isAdmin: boolean;
  disabled?: boolean;
}) {
  const [quota, setQuota] = useState<Quota | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQuota = useCallback(async () => {
    try {
      const res = await fetch("/api/reports/quota");
      const json = (await res.json()) as { status: string; data?: Quota };
      if (json.status === "OK" && json.data) {
        setQuota(json.data);
      }
    } catch {
      setQuota(null);
    }
  }, []);

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
          reportType,
          parcelId,
          lotId,
          agentQuestion,
          agentAnswerMarkdown,
        }),
      });
      let json: {
        status: string;
        message?: string;
        data?: { previewUrl: string; quota: Quota };
      };
      try {
        json = (await res.json()) as typeof json;
      } catch {
        setError(`Error del servidor (${res.status}). Reintenta o revisa los logs.`);
        return;
      }
      if (!res.ok || json.status !== "OK" || !json.data) {
        setError(json.message ?? "No se pudo generar el informe.");
        await loadQuota();
        return;
      }
      setQuota(json.data.quota);
      window.open(json.data.previewUrl, "_blank", "noopener,noreferrer");
    } catch {
      setError("Error de red al generar informe.");
    } finally {
      setBusy(false);
    }
  };

  if (quota === null) {
    return <p className={styles.muted}>Informes…</p>;
  }

  if (!quota.plusEnabled) {
    return (
      <div className={styles.block}>
        <PlanFeatureUpsell feature="reports" isAdmin={isAdmin} />
      </div>
    );
  }

  const point = quota.point;

  return (
    <div className={styles.block}>
      <div className={styles.row}>
        <Button
          type="button"
          onClick={() => void onGenerate()}
          disabled={busy || disabled || point.remaining <= 0}
        >
          {busy ? "Generando…" : label ?? `Generar ${REPORT_TYPE_LABELS[reportType]}`}
        </Button>
        <span className={styles.quota}>
          {point.used}/{point.limit} informes · {quota.billingMonth}
        </span>
      </div>
      {point.remaining <= 0 ? (
        <StateBanner
          title="Cuota mensual agotada"
          detail={`Plan ${quota.planSlug}: ${point.limit} informes/mes. Actualiza en billing o espera el próximo mes.`}
          tone="stale"
        />
      ) : null}
      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
