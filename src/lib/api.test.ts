import { describe, it, expect, vi, beforeEach } from "vitest";
import { categoryLabels } from "./api";

// Mock the supabase module
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            order: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
          single: vi.fn(() => Promise.resolve({ data: null, error: { code: "PGRST116" } })),
        })),
      })),
    })),
  },
}));

describe("categoryLabels", () => {
  it("should have all expected categories", () => {
    expect(categoryLabels).toHaveProperty("bodies");
    expect(categoryLabels).toHaveProperty("conjuntos");
    expect(categoryLabels).toHaveProperty("acessorios");
    expect(categoryLabels).toHaveProperty("kits");
  });

  it("should have correct Portuguese labels", () => {
    expect(categoryLabels.bodies).toBe("Bodies");
    expect(categoryLabels.conjuntos).toBe("Conjuntos");
    expect(categoryLabels.acessorios).toBe("Acessórios");
    expect(categoryLabels.kits).toBe("Kits Presente");
  });

  it("categoryLabels values should be non-empty strings", () => {
    Object.values(categoryLabels).forEach((label) => {
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
    });
  });

  it("should have exactly 4 categories", () => {
    expect(Object.keys(categoryLabels)).toHaveLength(4);
  });
});

describe("API mappers and queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchProducts", () => {
    it("should be importable", async () => {
      const { fetchProducts } = await import("./api");
      expect(typeof fetchProducts).toBe("function");
    });
  });

  describe("fetchFeaturedProducts", () => {
    it("should be importable", async () => {
      const { fetchFeaturedProducts } = await import("./api");
      expect(typeof fetchFeaturedProducts).toBe("function");
    });
  });

  describe("fetchProductBySlug", () => {
    it("should be importable", async () => {
      const { fetchProductBySlug } = await import("./api");
      expect(typeof fetchProductBySlug).toBe("function");
    });
  });

  describe("fetchTestimonials", () => {
    it("should be importable", async () => {
      const { fetchTestimonials } = await import("./api");
      expect(typeof fetchTestimonials).toBe("function");
    });
  });

  describe("fetchFAQs", () => {
    it("should be importable", async () => {
      const { fetchFAQs } = await import("./api");
      expect(typeof fetchFAQs).toBe("function");
    });
  });
});

// Test internal mapper functions by testing their behavior through exports
describe("Mapper logic (inferred from categoryLabels)", () => {
  it("should handle category mapping", () => {
    const categories = ["bodies", "conjuntos", "acessorios", "kits"] as const;

    categories.forEach((cat) => {
      expect(categoryLabels[cat]).toBeDefined();
      expect(typeof categoryLabels[cat]).toBe("string");
    });
  });
});
