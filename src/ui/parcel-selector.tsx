import type { Parcel } from "@/domain/parcel/types";
import styles from "./parcel-selector.module.css";

export function ParcelSelector({
  parcels,
  selectedId,
  onSelect,
  disabled = false,
}: {
  parcels: Parcel[];
  selectedId: string | null;
  onSelect: (parcelId: string) => void;
  disabled?: boolean;
}) {
  if (parcels.length === 0) {
    return <span className={styles.empty}>Sin parcelas</span>;
  }

  return (
    <label className={styles.field}>
      <span className={styles.label}>Parcela</span>
      <select
        className={styles.select}
        value={selectedId ?? ""}
        onChange={(event) => {
          const nextId = event.target.value;
          if (nextId) {
            onSelect(nextId);
          }
        }}
        disabled={disabled}
        aria-label="Seleccionar parcela"
      >
        {parcels.map((parcel) => (
          <option key={parcel.id} value={parcel.id}>
            {parcel.name}
          </option>
        ))}
      </select>
    </label>
  );
}
