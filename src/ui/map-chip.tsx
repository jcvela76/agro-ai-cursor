import styles from "./map-chip.module.css";

export function MapChip({
  label,
  variant = "default",
}: {
  label: string;
  variant?: "default" | "spectral";
}) {
  return (
    <span
      className={`${styles.chip} ${variant === "spectral" ? styles.chipSpectral : ""}`}
    >
      {variant === "spectral" ? <span className={styles.dot} aria-hidden /> : null}
      {label}
    </span>
  );
}
