"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./landing.module.css";

const NAV_LINKS = [
  { href: "#plataforma", label: "Plataforma" },
  { href: "#productos", label: "Productos" },
  { href: "#precios", label: "Precios" },
] as const;

export function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const headerClass = [
    styles.header,
    scrolled ? styles.headerScrolled : styles.headerOverHero,
    menuOpen ? styles.headerMenuOpen : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={headerClass}>
      <div className={styles.headerInner}>
        <a href="#" className={styles.brand}>
          Agro AI
        </a>

        <nav className={styles.navDesktop} aria-label="Principal">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className={styles.navLink}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className={styles.headerActions}>
          <Link href="/sign-in" className={styles.navEnter}>
            Entrar
          </Link>
          <a href="#lista" className={styles.btnPrimary}>
            Lista de espera
          </a>
        </div>

        <button
          type="button"
          className={styles.menuBtn}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className={`${styles.menuBar} ${menuOpen ? styles.menuBarTopOpen : ""}`} />
          <span className={`${styles.menuBar} ${menuOpen ? styles.menuBarMidOpen : ""}`} />
          <span className={`${styles.menuBar} ${menuOpen ? styles.menuBarBotOpen : ""}`} />
        </button>
      </div>

      {menuOpen ? (
        <div className={styles.mobileDrawer}>
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={styles.mobileLink}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
          <div className={styles.mobileCtas}>
            <Link href="/sign-in" className={styles.mobileEnter}>
              Entrar (cuenta existente)
            </Link>
            <a
              href="#lista"
              className={styles.btnPrimaryBlock}
              onClick={() => setMenuOpen(false)}
            >
              Lista de espera
            </a>
          </div>
        </div>
      ) : null}
    </header>
  );
}
