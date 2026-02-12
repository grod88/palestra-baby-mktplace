import { describe, it, expect } from "vitest";
import { cn, formatPrice } from "./utils";

describe("cn (class merge utility)", () => {
  it("should merge class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    const isActive = true;
    const isInactive = false;
    expect(cn("base", isActive && "active")).toBe("base active");
    expect(cn("base", isInactive && "inactive")).toBe("base");
  });

  it("should handle arrays", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("should handle objects", () => {
    expect(cn({ active: true, disabled: false })).toBe("active");
  });

  it("should handle undefined and null", () => {
    expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
  });

  it("should merge tailwind classes correctly", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("should handle empty inputs", () => {
    expect(cn()).toBe("");
    expect(cn("")).toBe("");
  });
});

describe("formatPrice", () => {
  it("should format price in BRL", () => {
    expect(formatPrice(59.9)).toBe("R$\u00a059,90");
  });

  it("should handle zero", () => {
    expect(formatPrice(0)).toBe("R$\u00a00,00");
  });

  it("should handle large numbers", () => {
    expect(formatPrice(1234.56)).toBe("R$\u00a01.234,56");
  });

  it("should handle integers", () => {
    expect(formatPrice(100)).toBe("R$\u00a0100,00");
  });

  it("should handle small decimals", () => {
    expect(formatPrice(0.01)).toBe("R$\u00a00,01");
  });

  it("should handle negative values", () => {
    expect(formatPrice(-50)).toMatch(/-?R?\$?\s?50,00/);
  });
});
