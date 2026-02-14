import { describe, it } from "vitest";

describe("v0.2.4.0 poster rendering TODO tests", () => {
  it.todo("renderPoster returns PNG buffer for smoke fixture model");
  it.todo("renderPoster output matches expected dimensions 687x1024 for current template");
  it.todo("renderPoster applies dynamic text overrides by node id and node name");
  it.todo("renderPoster applies progress track/background/bar color overrides");
  it.todo("ringPercent falls back to score fraction when ringPercent is undefined");
  it.todo("progress-bar start/gap direction follows .pen startAngle semantics");
  it.todo("invalid override params return invalid_poster_params in API layer");
  it.todo("scan_not_found maps to 404 in poster image API");
  it.todo("renderer internal failure maps to poster_render_failed 500 payload");
  it.todo("risk-grade config overlap fixture is rejected by config validator");
});
