import type { ReactNode } from "react";
import styles from "./state-banner.module.css";

type Tone = "stale" | "unavailable" | "error";

const toneClass: Record<Tone, string> = {
  stale: styles.stale,
  unavailable: styles.unavailable,
  error: styles.error,
};

export function StateBanner({
  title,
  detail,
  tone = "unavailable",
}: {
  title: string;
  detail?: ReactNode;
  tone?: Tone;
}) {
  return (
    <div className={`${styles.banner} ${toneClass[tone]}`} role="status">
      <strong className={styles.title}>{title}</strong>
      {detail ? <div className={styles.detail}>{detail}</div> : null}
    </div>
  );
}
