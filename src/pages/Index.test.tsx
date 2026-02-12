import { describe, it, expect } from "vitest";

// Index page is complex with many components
// We test it at the integration level through component tests
describe("Index Page module", () => {
  it("should be importable", async () => {
    const module = await import("./Index");
    expect(module.default).toBeDefined();
    expect(typeof module.default).toBe("function");
  });

  it("should export a default function (React component)", async () => {
    const module = await import("./Index");
    // React components are functions
    expect(typeof module.default).toBe("function");
    expect(module.default.name).toBe("Index");
  });
});
