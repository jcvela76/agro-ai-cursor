"use client";

import { useOrganization } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { ProductEntitlement } from "@/domain/auth/authorize-weather-access";
import { planDisplayLabel } from "@/domain/billing/plan-display";
import type { Parcel } from "@/domain/parcel/types";
import type { WorkspaceSettings } from "@/domain/workspace/types";
import { BillingWorkspaceNav } from "@/ui/billing-workspace-nav";
import { Button } from "@/ui/button";
import { DailyBriefingDeliveryPanel } from "@/ui/daily-briefing-delivery-panel";
import { OrgMembersPanel } from "@/ui/org-members-panel";
import styles from "./admin-panel.module.css";

const ENTITLEMENT_OPTIONS: { id: ProductEntitlement; label: string; hint: string }[] = [
  { id: "weather", label: "Weather base", hint: "Observación y pronóstico parcel-aware" },
  { id: "weather_plus", label: "Intelligence Plus", hint: "Implica Weather base" },
  { id: "traceability", label: "Traceability", hint: "Piloto coffee / EUDR" },
  {
    id: "agronomic_review",
    label: "Agronomic Review",
    hint: "Decisiones humanas append-only",
  },
];

export function AdminPanel() {
  const { organization } = useOrganization();
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [allowAll, setAllowAll] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [entitlements, setEntitlements] = useState<ProductEntitlement[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [settingsRes, parcelsRes] = await Promise.all([
          fetch("/api/workspace/settings"),
          fetch("/api/parcels"),
        ]);
        const settingsJson = (await settingsRes.json()) as {
          status: string;
          data?: WorkspaceSettings;
          message?: string;
        };
        const parcelsJson = (await parcelsRes.json()) as {
          status: string;
          data?: Parcel[];
        };
        if (!settingsRes.ok || settingsJson.status !== "OK" || !settingsJson.data) {
          if (!cancelled) {
            setError(settingsJson.message ?? "No se pudieron cargar los settings");
          }
          return;
        }
        if (!cancelled) {
          setSettings(settingsJson.data);
          setEntitlements(settingsJson.data.entitlements);
          const ids = settingsJson.data.authorizedParcelIds;
          setAllowAll(ids.length === 0);
          setSelectedIds(ids);
          if (parcelsRes.ok && parcelsJson.data) {
            setParcels(parcelsJson.data);
          }
        }
      } catch {
        if (!cancelled) {
          setError("No se pudieron cargar los settings");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleEntitlement = (id: ProductEntitlement) => {
    setEntitlements((prev) => {
      const has = prev.includes(id);
      if (has) {
        if (id === "weather") {
          return prev.filter((e) => e !== "weather" && e !== "weather_plus");
        }
        return prev.filter((e) => e !== id);
      }
      if (id === "weather_plus") {
        const next = new Set<ProductEntitlement>([...prev, "weather", "weather_plus"]);
        return [...next];
      }
      return [...prev, id];
    });
  };

  const toggleParcel = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/workspace/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entitlements,
          authorizedParcelIds: allowAll ? [] : selectedIds,
        }),
      });
      const json = (await res.json()) as {
        status: string;
        data?: WorkspaceSettings;
        message?: string;
      };
      if (!res.ok || json.status !== "OK" || !json.data) {
        setError(json.message ?? "No se pudo guardar");
        return;
      }
      setSettings(json.data);
      setEntitlements(json.data.entitlements);
      setAllowAll(json.data.authorizedParcelIds.length === 0);
      setSelectedIds(json.data.authorizedParcelIds);
      setMessage("Settings guardados");
    } catch {
      setError("No se pudo guardar");
    } finally {
      setBusy(false);
    }
  };

  const planSlug = settings?.billingPlanSlug ?? null;

  return (
    <div className={styles.shell}>
      <BillingWorkspaceNav active="admin" orgName={organization?.name} />

      <div className={styles.page}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Workspace</p>
            <h1 className={styles.title}>Admin</h1>
          </div>
        </header>

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        {message ? <p className={styles.ok}>{message}</p> : null}

        {!settings && !error ? <p className={styles.muted}>Cargando…</p> : null}

        {settings ? (
          <>
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Suscripción</h2>
              <p className={styles.planName}>{planDisplayLabel(planSlug)}</p>
              <p className={styles.planSlug}>
                Slug: <code>{planSlug ?? "— (sin sync aún)"}</code>
              </p>
              <p className={styles.muted}>
                Sincronizado por Clerk Billing (webhook). Fechas y facturas en el portal de Clerk.
              </p>
              <p>
                <Link className={styles.inlineLink} href="/app/billing">
                  Gestionar suscripción →
                </Link>
              </p>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHeading}>
                <h2>Entitlements</h2>
                <span className={styles.badge}>Override ops</span>
              </div>
              <p className={styles.muted}>
                Productos en metadata público de la organización. El webhook de billing puede
                sobrescribir al cambiar de plan; este formulario es para operaciones manuales.
              </p>
              <ul className={styles.checkList}>
                {ENTITLEMENT_OPTIONS.map((opt) => (
                  <li key={opt.id}>
                    <label className={styles.check}>
                      <input
                        type="checkbox"
                        checked={entitlements.includes(opt.id)}
                        onChange={() => toggleEntitlement(opt.id)}
                      />
                      <span>
                        <strong>{opt.label}</strong>
                        <small>{opt.hint}</small>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>

            <section className={styles.section}>
              <h2>Allowlist de parcelas</h2>
              <p className={styles.muted}>
                Vacío / “Todas” = cualquier parcela del org con Weather (ADR-011). Lista no vacía =
                restrictiva (no es exclusiva de Plus).
              </p>
              <label className={styles.check}>
                <input
                  type="radio"
                  name="allow"
                  checked={allowAll}
                  onChange={() => setAllowAll(true)}
                />
                <span>Todas las parcelas del workspace</span>
              </label>
              <label className={styles.check}>
                <input
                  type="radio"
                  name="allow"
                  checked={!allowAll}
                  onChange={() => setAllowAll(false)}
                />
                <span>Solo parcelas seleccionadas</span>
              </label>
              {!allowAll ? (
                <ul className={styles.checkList}>
                  {parcels.length === 0 ? (
                    <li className={styles.muted}>No hay parcelas en este workspace</li>
                  ) : (
                    parcels.map((p) => (
                      <li key={p.id}>
                        <label className={styles.check}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(p.id)}
                            onChange={() => toggleParcel(p.id)}
                          />
                          <span>
                            <strong>{p.name}</strong>
                            <small>{p.id}</small>
                          </span>
                        </label>
                      </li>
                    ))
                  )}
                </ul>
              ) : null}
            </section>

            <div className={styles.actions}>
              <Button type="button" onClick={() => void save()} disabled={busy}>
                Guardar settings
              </Button>
            </div>

            <DailyBriefingDeliveryPanel parcels={parcels} />
          </>
        ) : null}

        <section className={styles.section}>
          <h2>Miembros</h2>
          <p className={styles.muted}>
            Invitaciones y roles. La facturación vive en{" "}
            <Link className={styles.inlineLink} href="/app/billing">
              Suscripción
            </Link>
            .
          </p>
          <OrgMembersPanel />
        </section>
      </div>
    </div>
  );
}
