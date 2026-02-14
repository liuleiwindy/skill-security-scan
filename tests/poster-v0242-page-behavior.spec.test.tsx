import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";
import React from "react";
import { PosterPageContent } from "@/app/scan/poster/[id]/PosterPageContent";

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

vi.mock("@/components/PosterImage", () => ({
  PosterImage: ({
    scanId,
    src,
    onLoad,
    onError,
  }: {
    scanId: string;
    src?: string;
    onLoad?: () => void;
    onError?: (type: string) => void;
  }) => (
    <div data-testid="poster-image-proxy" data-scan-id={scanId} data-src={src ?? ""}>
      <button onClick={() => onLoad?.()}>mock-load</button>
      <button onClick={() => onError?.("network")}>mock-error</button>
    </div>
  ),
}));

vi.mock("@/components/SaveButton", () => ({
  SaveButton: ({
    scanId,
    onSaveSuccess,
    onSaveFailure,
  }: {
    scanId: string;
    onSaveSuccess?: () => void;
    onSaveFailure?: () => void;
  }) => (
    <div data-testid="save-button-proxy" data-scan-id={scanId}>
      <button onClick={() => onSaveSuccess?.()}>mock-save-success</button>
      <button onClick={() => onSaveFailure?.()}>mock-save-failure</button>
    </div>
  ),
}));

describe("v0.2.4.2 poster page behavior", () => {
  it("passes scanId to PosterImage and does not inject query override into src", () => {
    render(<PosterPageContent scanId="scan_fixture_v0240_b69" />);
    const proxy = screen.getByTestId("poster-image-proxy");
    expect(proxy).toHaveAttribute("data-scan-id", "scan_fixture_v0240_b69");
    expect(proxy).toHaveAttribute("data-src", "");
  });

  it("renders Back to Scan and Open Report links with expected targets", () => {
    render(<PosterPageContent scanId="scan_fixture_v0240_b69" />);
    expect(screen.getByRole("link", { name: /back to scan/i })).toHaveAttribute("href", "/scan");
    expect(
      screen.getByRole("link", { name: /view full report for scan scan_fixture_v0240_b69/i })
    ).toHaveAttribute(
      "href",
      "/scan/report/scan_fixture_v0240_b69"
    );
  });

  it("shows save success status when SaveButton success callback fires", () => {
    render(<PosterPageContent scanId="scan_fixture_v0240_a90" />);
    fireEvent.click(screen.getByText("mock-save-success"));
    expect(screen.getByText(/poster saved successfully/i)).toBeInTheDocument();
  });

  it("shows save error status when SaveButton failure callback fires", () => {
    render(<PosterPageContent scanId="scan_edge_d0" />);
    fireEvent.click(screen.getByText("mock-save-failure"));
    expect(screen.getByText(/save failed\. please try again/i)).toBeInTheDocument();
  });
});
