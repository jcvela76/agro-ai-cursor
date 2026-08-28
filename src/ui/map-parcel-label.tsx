import styles from "./map-parcel-label.module.css";

export function MapParcelLabel({
  name,
  areaHectares,
}: {
  name: string;
  areaHectares: number;
}) {
  const areaLabel =
    areaHectares >= 10
      ? `${areaHectares.toFixed(0)} ha`
      : `${areaHectares.toFixed(1)} ha`;

  return (
    <div className={styles.label}>
      <p className={styles.name}>{name}</p>
      <p className={styles.area}>{areaLabel}</p>
    </div>
  );
}
