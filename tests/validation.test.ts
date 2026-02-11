import { describe, expect, it } from "vitest";
import {
  validateRepoUrl,
  validateScanRequest,
  validateScanId,
  isAllowedDomain,
  sanitizeFilePath,
} from "@/lib/validation";

describe("validation", () => {
  it("accepts valid github url", () => {
    expect(validateRepoUrl("https://github.com/org/repo").valid).toBe(true);
  });

  it("accepts github tree deep link", () => {
    expect(
      validateRepoUrl("https://github.com/openclaw/openclaw/tree/main/skills/nano-pdf").valid
    ).toBe(true);
  });

  it("rejects invalid url", () => {
    const result = validateRepoUrl("https://gitlab.com/org/repo");
    expect(result.valid).toBe(false);
  });

  it("validates scan request object", () => {
    expect(validateScanRequest({ repoUrl: "https://github.com/a/b" }).valid).toBe(true);
    expect(validateScanRequest({ repoUrl: "x" }).valid).toBe(false);
  });

  it("validates scan id prefix", () => {
    expect(validateScanId("scan_abc").valid).toBe(true);
    expect(validateScanId("abc").valid).toBe(false);
  });

  it("checks allowed domain and path sanitize", () => {
    expect(isAllowedDomain("https://github.com/org/repo")).toBe(true);
    expect(sanitizeFilePath("../../etc/passwd")).toBe("//etc/passwd");
  });
});
