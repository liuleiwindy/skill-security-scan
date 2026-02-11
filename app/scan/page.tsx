"use client";

import { useState } from "react";
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
        <p className={styles.badge}>Security Scan V0.1</p>
        <h1 className={styles.title}>Scan Your Skill Repo</h1>
        <p className={styles.subtitle}>
          Paste a GitHub repo URL to generate a shareable security report and poster.
        </p>
        <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.5rem', textAlign: 'center' }}>
          ⚠️ V0.1 Demo: This version uses simulated scan results for demonstration purposes.
        </p>
        <form onSubmit={onSubmit} className={styles.form}>
          <input
            className={styles.input}
            placeholder="https://github.com/org/repo"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            required
          />
          <button className={styles.button} disabled={loading}>
            {loading ? "Scanning..." : "Start Scan"}
          </button>
        </form>
        {error ? <p className={styles.error}>{error}</p> : null}
      </section>
    </main>
  );
}
