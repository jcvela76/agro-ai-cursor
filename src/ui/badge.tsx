import type { ReactNode } from "react";
import styles from "./badge.module.css";

type Tone = "fresh" | "stale" | "unknown" | "error";

const toneClass: Record<Tone, string> = {
  fresh: styles.fresh,
  stale: styles.stale,
  unknown: styles.unknown,
  error: styles.error,
};

export function Badge({
  children,
  tone = "unknown",
}: {
  children: ReactNode;
  tone?: Tone;
}) {
  return <span className={`${styles.badge} ${toneClass[tone]}`}>{children}</span>;
}
