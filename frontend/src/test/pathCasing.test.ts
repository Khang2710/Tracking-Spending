import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("cross-platform source paths", () => {
  it("uses the lowercase statistics directory expected by application imports", () => {
    const trackedPaths = execFileSync(
      "git",
      ["-C", process.cwd(), "ls-files", "src/features"],
      { encoding: "utf8" },
    );

    expect(trackedPaths).toContain("src/features/statistics/");
    expect(trackedPaths).not.toContain("src/features/Statistics/");
  });
});
