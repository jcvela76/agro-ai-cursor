"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import {
  SHELL_TOUR_STEPS,
  SHELL_TOUR_STORAGE_KEY,
} from "@/content/shell/tour-steps";
import { Button } from "@/ui/button";
import { trackPilotEvent } from "@/ui/pilot/track-pilot";
import styles from "./shell-tour.module.css";

type ShellTourProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** On mount, open once if localStorage has no completion flag. */
  autoStart?: boolean;
};

function readTourDone(): boolean {
  try {
    return window.localStorage.getItem(SHELL_TOUR_STORAGE_KEY) === "done";
  } catch {
    return false;
  }
}

function writeTourDone(): void {
  try {
    window.localStorage.setItem(SHELL_TOUR_STORAGE_KEY, "done");
  } catch {
    // ignore
  }
}

export function ShellTour({ open, onOpenChange, autoStart = true }: ShellTourProps) {
  const titleId = useId();
  const [stepIndex, setStepIndex] = useState(0);
  const startedRef = useRef(false);
  const autoTriedRef = useRef(false);

  useEffect(() => {
    if (!autoStart || autoTriedRef.current) return;
    autoTriedRef.current = true;
    const timer = window.setTimeout(() => {
      if (readTourDone()) return;
      onOpenChange(true);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [autoStart, onOpenChange]);

  useEffect(() => {
    if (!open) {
      startedRef.current = false;
      return;
    }
    setStepIndex(0);
    if (!startedRef.current) {
      startedRef.current = true;
      void trackPilotEvent("shell.tour_start", {
        replay: readTourDone(),
      });
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        writeTourDone();
        void trackPilotEvent("shell.tour_skip", {
          step: SHELL_TOUR_STEPS[stepIndex]?.id,
        });
        onOpenChange(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, stepIndex, onOpenChange]);

  function finish(reason: "complete" | "skip") {
    writeTourDone();
    void trackPilotEvent(
      reason === "complete" ? "shell.tour_complete" : "shell.tour_skip",
      { step: SHELL_TOUR_STEPS[stepIndex]?.id },
    );
    onOpenChange(false);
  }

  function goNext() {
    const step = SHELL_TOUR_STEPS[stepIndex];
    void trackPilotEvent("shell.tour_step", {
      id: step.id,
      index: stepIndex,
    });
    if (stepIndex >= SHELL_TOUR_STEPS.length - 1) {
      finish("complete");
      return;
    }
    setStepIndex((i) => i + 1);
  }

  function goBack() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  if (!open) return null;

  const step = SHELL_TOUR_STEPS[stepIndex];
  const isLast = stepIndex === SHELL_TOUR_STEPS.length - 1;
  const hasCta = "ctaHref" in step && step.ctaHref;

  return (
    <div className={styles.root} role="presentation">
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Cerrar guía"
        onClick={() => finish("skip")}
      />
      <div
        className={styles.card}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <p className={styles.eyebrow}>
          Guía rápida · {stepIndex + 1} / {SHELL_TOUR_STEPS.length}
        </p>
        <h2 id={titleId} className={styles.title}>
          {step.title}
        </h2>
        <p className={styles.body}>{step.body}</p>
        <div className={styles.dots} aria-hidden>
          {SHELL_TOUR_STEPS.map((s, i) => (
            <span
              key={s.id}
              className={i === stepIndex ? styles.dotActive : styles.dot}
            />
          ))}
        </div>
        <div className={styles.actions}>
          <Button type="button" variant="ghost" onClick={() => finish("skip")}>
            Omitir
          </Button>
          <div className={styles.actionsRight}>
            {stepIndex > 0 ? (
              <Button type="button" variant="ghost" onClick={goBack}>
                Atrás
              </Button>
            ) : null}
            {hasCta ? (
              <Link
                className={styles.ctaLink}
                href={step.ctaHref}
                onClick={() => finish("complete")}
              >
                {step.ctaLabel}
              </Link>
            ) : null}
            <Button type="button" variant="primary" onClick={goNext}>
              {isLast ? "Listo" : "Siguiente"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
