import type { ReactNode } from "react";
import styles from "./panel.module.css";

export function Panel({
  children,
  title,
  onClose,
  className = "",
  density = "default",
}: {
  children: ReactNode;
  title?: string;
  onClose?: () => void;
  className?: string;
  density?: "default" | "compact";
}) {
  return (
    <aside
      className={`${styles.panel} ${density === "compact" ? styles.compact : ""} ${className}`}
    >
      {(title || onClose) && (
        <header className={styles.header}>
          {title ? <h2 className={styles.title}>{title}</h2> : <span />}
          {onClose ? (
            <button type="button" className={styles.close} onClick={onClose} aria-label="Cerrar">
              ×
            </button>
          ) : null}
        </header>
      )}
      <div className={styles.body}>{children}</div>
    </aside>
  );
}
