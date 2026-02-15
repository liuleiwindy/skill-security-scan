"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@/lib/analytics/track";
import styles from "./scan.module.css";

type ScanResponse = {
  scanId: string;
  status: string;
};

type InputType = "github_url" | "npm_command" | "unknown";

export default function ScanPage() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  // Track page view on first render
  useEffect(() => {
    track("scan_page_view");
  }, []);

  function getScanPhase(elapsed: number): string {
    if (elapsed < 5000) return "Connecting to GitHub…";
    if (elapsed < 15000) return "Fetching repository files…";
    return "Analyzing files for security issues…";
  }

  // Detect input type from user input
  function detectInputType(input: string): InputType {
    const trimmed = input.trim().toLowerCase();

    // GitHub URL patterns
    if (
      trimmed.startsWith("https://github.com/") ||
      trimmed.startsWith("github.com/") ||
      trimmed.startsWith("git@github.com:") ||
      trimmed.match(/^https?:\/\/[^/]*github\.[^/]+\//)
    ) {
      return "github_url";
    }

    // NPM command patterns
    if (
      trimmed.match(/^npm\s+install\s+/) ||
      trimmed.match(/^npm\s+i\s+/) ||
      trimmed.match(/^yarn\s+add\s+/) ||
      trimmed.match(/^pnpm\s+add\s+/) ||
      trimmed.match(/^bun\s+add\s+/) ||
      trimmed.match(/^npx\s+/) ||
      trimmed.match(/^npm\s+create\s+/) ||
      trimmed.match(/^yarn\s+create\s+/)
    ) {
      return "npm_command";
    }

    // Fallback for unrecognizable inputs
    return "unknown";
  }

  // Map error to error_code format {domain}_{type}
  function mapErrorCode(error: unknown): string {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes("timeout") || message.includes("timed out")) {
        return "scan_timeout";
      }

      if (message.includes("network") || message.includes("fetch failed")) {
        return "scan_network";
      }
    }

    // For HTTP errors, we'll handle in the API response check
    return "scan_unknown";
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

    // Record start time for duration measurement
    const startTime = Date.now();

    // Detect and track input type
    const inputType = detectInputType(repoUrl);
    track("scan_submit_clicked", { input_type: inputType });

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });
      const data = (await res.json()) as ScanResponse & { message?: string };

      // Calculate duration
      const durationMs = Date.now() - startTime;

      if (!res.ok) {
        // Map HTTP status to error code
        let errorCode = "scan_unknown";
        if (res.status >= 400 && res.status < 500) {
          errorCode = "scan_http_4xx";
        } else if (res.status >= 500) {
          errorCode = "scan_http_5xx";
        }

        // Track error result
        track("scan_result", {
          status: "error",
          duration_ms: durationMs,
          error_code: errorCode,
        });

        setError(data.message ?? "Scan failed");
        return;
      }

      // Track successful result
      track("scan_result", {
        status: "success",
        duration_ms: durationMs,
        scan_id: data.scanId,
      });

      router.push(`/scan/report/${data.scanId}`);
    } catch (err) {
      // Calculate duration for network errors
      const durationMs = Date.now() - startTime;

      // Map error to error code
      const errorCode = mapErrorCode(err);

      // Track error result
      track("scan_result", {
        status: "error",
        duration_ms: durationMs,
        error_code: errorCode,
      });

      setError("Network error. Please retry.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.badge}>Security Scan</p>
        <h1 className={styles.title}>Scan Your Skill Repo</h1>
        <p className={styles.subtitle}>
          Paste a GitHub URL, or npm/npx command, to generate a shareable security report and poster.
        </p>
        <form onSubmit={onSubmit} className={styles.form}>
          <input
            className={styles.input}
            placeholder="powered by myskills.info"
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
