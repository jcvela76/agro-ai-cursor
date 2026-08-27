import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./button.module.css";

type Variant = "primary" | "ghost" | "onDark";

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
}) {
  return (
    <button className={`${styles.button} ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
