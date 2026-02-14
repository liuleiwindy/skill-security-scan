import type { Metadata } from "next";
import { PosterPageContent } from "./PosterPageContent";

/**
 * Poster Page V0.2.4.2 - Base Structure
 * 
 * Task 1.1: Create `/scan/poster/[id]` route structure
 * 
 * This page provides the foundation for:
 * - Rendering generated poster image from /api/scan/:id/poster/image
 * - Mobile-first save-to-local interaction
 * - Share handoff to report via QR code
 */

/**
 * Basic validation for scan ID format
 * 
 * @param id - The scan ID to validate
 * @returns true if the ID appears valid, false otherwise
 */
function isValidScanId(id: string): boolean {
  // Basic validation: non-empty string, reasonable length
  if (!id || typeof id !== "string") return false;
  
  // Should be at least 1 character and not excessively long
  const trimmedId = id.trim();
  return trimmedId.length > 0 && trimmedId.length <= 100;
}

/**
 * Generate page metadata based on scan ID
 * 
 * @param scanId - The scan ID
 * @returns Next.js metadata object
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  
  return {
    title: `Security Scan Poster - ${id}`,
    description: "View and save your security scan poster",
    openGraph: {
      title: `Security Scan Poster - ${id}`,
      description: "View and save your security scan poster",
      type: "website",
    },
  };
}

/**
 * Poster Page Component
 *
 * Renders the poster page with:
 * - Header: Back navigation
 * - Main Content: Poster image + Save button (Task 4.1 & 4.2)
 * - Footer: Simple copyright (optional)
 *
 * @param params - Route parameters containing the scan ID
 * @returns The poster page component
 */
export default async function PosterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const scanId = id;

  // Validate scan ID format
  if (!isValidScanId(scanId)) {
    throw new Error("Invalid scan ID format");
  }

  // Render client-side component that handles interactivity
  return <PosterPageContent scanId={scanId} />;
}
