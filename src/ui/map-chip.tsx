import styles from "./map-chip.module.css";

export function MapChip({ label }: { label: string }) {
  return <span className={styles.chip}>{label}</span>;
}
