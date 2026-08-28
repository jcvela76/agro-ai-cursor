import styles from "./spectral-parcel-summary.module.css";

export function SpectralParcelSummary({
  title,
  areaHectares,
}: {
  title: string;
  areaHectares: number;
}) {
  const areaLabel =
    areaHectares >= 10
      ? `${areaHectares.toFixed(0)} ha`
      : `${areaHectares.toFixed(1)} ha`;

  return (
    <div className={styles.card}>
      <span className={styles.title}>{title}</span>
      <span className={styles.area}>{areaLabel}</span>
    </div>
  );
}
