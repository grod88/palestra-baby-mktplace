import { describe, it, expect } from "vitest";
import { products, testimonials, faqs } from "./products";

describe("products data", () => {
  it("should have products array", () => {
    expect(Array.isArray(products)).toBe(true);
    expect(products.length).toBeGreaterThan(0);
  });

  it("each product should have required fields", () => {
    products.forEach((product) => {
      expect(product).toHaveProperty("id");
      expect(product).toHaveProperty("name");
      expect(product).toHaveProperty("slug");
      expect(product).toHaveProperty("price");
      expect(product).toHaveProperty("description");
      expect(product).toHaveProperty("shortDescription");
      expect(product).toHaveProperty("images");
      expect(product).toHaveProperty("category");
      expect(product).toHaveProperty("sizes");
      expect(product).toHaveProperty("inStock");
      expect(product).toHaveProperty("featured");
      expect(product).toHaveProperty("careInstructions");
      expect(product).toHaveProperty("measurements");
    });
  });

  it("product prices should be positive numbers", () => {
    products.forEach((product) => {
      expect(typeof product.price).toBe("number");
      expect(product.price).toBeGreaterThan(0);
    });
  });

  it("product slugs should be valid URL-safe strings", () => {
    products.forEach((product) => {
      expect(product.slug).toMatch(/^[a-z0-9-]+$/);
    });
  });

  it("product categories should be valid", () => {
    const validCategories = ["bodies", "conjuntos", "acessorios", "kits"];
    products.forEach((product) => {
      expect(validCategories).toContain(product.category);
    });
  });

  it("product sizes should be non-empty arrays", () => {
    products.forEach((product) => {
      expect(Array.isArray(product.sizes)).toBe(true);
      expect(product.sizes.length).toBeGreaterThan(0);
    });
  });

  it("product images should be non-empty arrays", () => {
    products.forEach((product) => {
      expect(Array.isArray(product.images)).toBe(true);
      expect(product.images.length).toBeGreaterThan(0);
    });
  });

  it("products with originalPrice should have it higher than price", () => {
    products.forEach((product) => {
      if (product.originalPrice !== undefined) {
        expect(product.originalPrice).toBeGreaterThan(product.price);
      }
    });
  });

  it("should have some featured products", () => {
    const featuredProducts = products.filter((p) => p.featured);
    expect(featuredProducts.length).toBeGreaterThan(0);
  });
});

describe("testimonials data", () => {
  it("should have testimonials array", () => {
    expect(Array.isArray(testimonials)).toBe(true);
    expect(testimonials.length).toBeGreaterThan(0);
  });

  it("each testimonial should have required fields", () => {
    testimonials.forEach((testimonial) => {
      expect(testimonial).toHaveProperty("id");
      expect(testimonial).toHaveProperty("name");
      expect(testimonial).toHaveProperty("avatar");
      expect(testimonial).toHaveProperty("text");
      expect(testimonial).toHaveProperty("rating");
    });
  });

  it("testimonial ratings should be between 1 and 5", () => {
    testimonials.forEach((testimonial) => {
      expect(testimonial.rating).toBeGreaterThanOrEqual(1);
      expect(testimonial.rating).toBeLessThanOrEqual(5);
    });
  });
});

describe("faqs data", () => {
  it("should have faqs array", () => {
    expect(Array.isArray(faqs)).toBe(true);
    expect(faqs.length).toBeGreaterThan(0);
  });

  it("each faq should have question and answer", () => {
    faqs.forEach((faq) => {
      expect(faq).toHaveProperty("question");
      expect(faq).toHaveProperty("answer");
      expect(typeof faq.question).toBe("string");
      expect(typeof faq.answer).toBe("string");
      expect(faq.question.length).toBeGreaterThan(0);
      expect(faq.answer.length).toBeGreaterThan(0);
    });
  });
});
