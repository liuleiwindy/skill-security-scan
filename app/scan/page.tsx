"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./scan.module.css";

type ScanResponse = {
  scanId: string;
  status: string;
};

export default function ScanPage() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  function getScanPhase(elapsed: number): string {
    if (elapsed < 5000) return "Connecting to GitHub…";
    if (elapsed < 15000) return "Fetching repository files…";
    return "Analyzing files for security issues…";
  }

  useEffect(() => {
    if (!loading) {
      setElapsedMs(0);
      return;
    }
    const start = Date.now();
    const timer = setInterval(() => {
      setElapsedMs(Date.now() - start);
    }, 1000);
    return () => clearInterval(timer);
  }, [loading]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });
      const data = (await res.json()) as ScanResponse & { message?: string };
      if (!res.ok) {
        setError(data.message ?? "Scan failed");
        return;
      }
      router.push(`/scan/report/${data.scanId}`);
    } catch {
      setError("Network error. Please retry.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.badge}>Security Scan v0.2.3</p>
        <h1 className={styles.title}>Scan Your Skill Repo</h1>
        <p className={styles.subtitle}>
          Paste a GitHub URL, or npm/npx command, to generate a shareable security report and poster.
        </p>
        <p
          style={{
            fontSize: "0.875rem",
            color: "#94a3b8",
            marginTop: "0.5rem",
            textAlign: "center",
          }}
        >
          v0.2.3: Adds prompt-injection risk scanning on top of the v0.2.2 GitHub + npm analysis.
        </p>
        <form onSubmit={onSubmit} className={styles.form}>
          <input
            className={styles.input}
            placeholder="https://github.com/org/repo or npx create-next-app@14"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            required
            disabled={loading}
          />
          <button className={styles.button} disabled={loading}>
            {loading ? "Scanning..." : "Start Scan"}
          </button>
        </form>
        {loading ? (
          <>
            <p className={styles.loadingHint}>
              {getScanPhase(elapsedMs)} This can take about 20–40 seconds for larger repositories.
            </p>
            <div className={styles.progressBarContainer}>
              <div className={styles.progressBarTrack}>
                <div className={styles.progressBarFill} />
              </div>
            </div>
          </>
        ) : null}
        {error ? <p className={styles.error}>{error}</p> : null}
      </section>
    </main>
  );
}
