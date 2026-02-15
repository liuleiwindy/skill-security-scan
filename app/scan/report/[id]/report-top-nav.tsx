"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./report.module.css";

export function ReportTopNav() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function onResize() {
      if (window.innerWidth > 900) setOpen(false);
    }

    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div className={styles.navShell}>
      <header className={`${styles.panel} ${styles.topBar}`}>
        <div className={styles.brand}>MYSKILLS_PROTOCOL</div>

        <nav className={styles.desktopNav}>
          <Link href="/" className={styles.chip}>
            HOME
          </Link>
          <Link href="/scan" className={styles.chip}>
            SECURITY SCAN
          </Link>
          <span className={styles.chip} aria-disabled="true">
            LEADERBOARD
          </span>
        </nav>

        <button
          type="button"
          className={`${styles.menuButton} ${styles.mobileMenuToggle}`}
          aria-label="Open navigation menu"
          aria-controls="report-mobile-menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          ref={buttonRef}
        >
          <span className={styles.menuIcon} aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
      </header>

      {open ? (
        <nav className={styles.mobileMenuOverlay} id="report-mobile-menu" ref={panelRef}>
          <Link href="/" className={styles.mobileLink} onClick={() => setOpen(false)}>
            HOME
          </Link>
          <Link href="/scan" className={styles.mobileLink} onClick={() => setOpen(false)}>
            SECURITY SCAN
          </Link>
          <span className={styles.mobileLink} aria-disabled="true">
            LEADERBOARD
          </span>
        </nav>
      ) : null}
    </div>
  );
}
