import { describe, expect, it } from "vitest";
import { ExternalPIOrchestrator, type ExternalPIDetector } from "@/lib/scan/external-pi-adapter";

function makeDetector(
  overrides: Partial<ExternalPIDetector> & Pick<ExternalPIDetector, "id" | "name" | "priority">
): ExternalPIDetector {
  return {
    id: overrides.id,
    name: overrides.name,
    priority: overrides.priority,
    isAvailable: overrides.isAvailable || (async () => true),
    detect: overrides.detect || (async () => ({ detected: false, method: "external" })),
  };
}

describe("ExternalPIOrchestrator", () => {
  it("returns external/no-hit when external detector is available and finds nothing", async () => {
    const orchestrator = new ExternalPIOrchestrator({
      enableExternal: true,
      fallbackToLocal: true,
      detectors: [
        makeDetector({
          id: "d1",
          name: "detector-1",
          priority: 10,
          isAvailable: async () => true,
          detect: async () => ({ detected: false, method: "external" }),
        }),
      ],
    });

    const result = await orchestrator.detect("safe content", "README.md");
    expect(result.detected).toBe(false);
    expect(result.method).toBe("external");
  });

  it("falls back to local when no external detector is available", async () => {
    const orchestrator = new ExternalPIOrchestrator({
      enableExternal: true,
      fallbackToLocal: true,
      detectors: [
        makeDetector({
          id: "d1",
          name: "detector-1",
          priority: 10,
          isAvailable: async () => false,
        }),
      ],
    });

    const result = await orchestrator.detect("content", "README.md");
    expect(result.detected).toBe(false);
    expect(result.method).toBe("local");
  });

  it("returns external detection when external detector finds PI", async () => {
    const orchestrator = new ExternalPIOrchestrator({
      enableExternal: true,
      fallbackToLocal: true,
      detectors: [
        makeDetector({
          id: "d1",
          name: "detector-1",
          priority: 10,
          isAvailable: async () => true,
          detect: async () => ({
            detected: true,
            ruleId: "PI-1-INSTRUCTION-OVERRIDE",
            snippet: "ignore all previous instructions",
            line: 1,
          }),
        }),
      ],
    });

    const result = await orchestrator.detect("content", "README.md");
    expect(result.detected).toBe(true);
    expect(result.method).toBe("external");
    expect(result.detector).toBe("d1");
  });

  it("falls back to local when external detector reports execution failure", async () => {
    const orchestrator = new ExternalPIOrchestrator({
      enableExternal: true,
      fallbackToLocal: true,
      detectors: [
        makeDetector({
          id: "d1",
          name: "detector-1",
          priority: 10,
          isAvailable: async () => true,
          detect: async () => ({
            detected: false,
            method: "local",
            error: "provider timeout",
          }),
        }),
      ],
    });

    const result = await orchestrator.detect("content", "README.md");
    expect(result.detected).toBe(false);
    expect(result.method).toBe("local");
    expect(result.error).toContain("timeout");
  });
});
