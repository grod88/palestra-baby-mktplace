import { describe, it, expect, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useCart } from "./useCart";
import type { Product } from "@/types";

const mockProduct: Product = {
  id: "prod-1",
  name: "Body Verde Palmeiras",
  slug: "body-verde-palmeiras",
  price: 59.9,
  originalPrice: 79.9,
  description: "Body temático do Palmeiras",
  shortDescription: "Body verde",
  images: ["/img1.jpg", "/img2.jpg"],
  category: "bodies",
  sizes: ["P", "M", "G"],
  inStock: true,
  featured: true,
  careInstructions: ["Lavar à mão"],
  measurements: { P: "0-3m", M: "3-6m", G: "6-12m" },
};

const mockProduct2: Product = {
  id: "prod-2",
  name: "Conjunto Alviverde",
  slug: "conjunto-alviverde",
  price: 89.9,
  description: "Conjunto completo",
  shortDescription: "Conjunto verde",
  images: ["/img3.jpg"],
  category: "conjuntos",
  sizes: ["M", "G"],
  inStock: true,
  featured: false,
  careInstructions: [],
  measurements: {},
};

describe("useCart", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset store state
    const { result } = renderHook(() => useCart());
    act(() => {
      result.current.clearCart();
      result.current.closeCart();
    });
  });

  describe("addItem", () => {
    it("should add a new item to the cart", () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addItem(mockProduct, "M");
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0]).toEqual({
        product: mockProduct,
        size: "M",
        quantity: 1,
      });
    });

    it("should increase quantity when adding same product and size", () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addItem(mockProduct, "M");
        result.current.addItem(mockProduct, "M");
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(2);
    });

    it("should add as separate item when same product but different size", () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addItem(mockProduct, "M");
        result.current.addItem(mockProduct, "G");
      });

      expect(result.current.items).toHaveLength(2);
    });

    it("should open cart when adding item", () => {
      const { result } = renderHook(() => useCart());

      expect(result.current.isOpen).toBe(false);

      act(() => {
        result.current.addItem(mockProduct, "M");
      });

      expect(result.current.isOpen).toBe(true);
    });

    it("should add custom quantity", () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addItem(mockProduct, "M", 3);
      });

      expect(result.current.items[0].quantity).toBe(3);
    });
  });

  describe("removeItem", () => {
    it("should remove item from cart", () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addItem(mockProduct, "M");
        result.current.addItem(mockProduct2, "G");
      });

      expect(result.current.items).toHaveLength(2);

      act(() => {
        result.current.removeItem(mockProduct.id, "M");
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].product.id).toBe(mockProduct2.id);
    });

    it("should not remove item with same id but different size", () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addItem(mockProduct, "M");
        result.current.addItem(mockProduct, "G");
      });

      act(() => {
        result.current.removeItem(mockProduct.id, "M");
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].size).toBe("G");
    });
  });

  describe("updateQuantity", () => {
    it("should update quantity of item", () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addItem(mockProduct, "M");
      });

      act(() => {
        result.current.updateQuantity(mockProduct.id, "M", 5);
      });

      expect(result.current.items[0].quantity).toBe(5);
    });

    it("should remove item when quantity is set to 0", () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addItem(mockProduct, "M");
      });

      act(() => {
        result.current.updateQuantity(mockProduct.id, "M", 0);
      });

      expect(result.current.items).toHaveLength(0);
    });

    it("should remove item when quantity is negative", () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addItem(mockProduct, "M");
      });

      act(() => {
        result.current.updateQuantity(mockProduct.id, "M", -1);
      });

      expect(result.current.items).toHaveLength(0);
    });
  });

  describe("clearCart", () => {
    it("should remove all items", () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addItem(mockProduct, "M");
        result.current.addItem(mockProduct2, "G");
      });

      expect(result.current.items).toHaveLength(2);

      act(() => {
        result.current.clearCart();
      });

      expect(result.current.items).toHaveLength(0);
    });
  });

  describe("cart drawer state", () => {
    it("should open cart", () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.openCart();
      });

      expect(result.current.isOpen).toBe(true);
    });

    it("should close cart", () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.openCart();
      });

      act(() => {
        result.current.closeCart();
      });

      expect(result.current.isOpen).toBe(false);
    });

    it("should toggle cart", () => {
      const { result } = renderHook(() => useCart());

      expect(result.current.isOpen).toBe(false);

      act(() => {
        result.current.toggleCart();
      });

      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.toggleCart();
      });

      expect(result.current.isOpen).toBe(false);
    });
  });

  describe("getTotalItems", () => {
    it("should return total count of items", () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addItem(mockProduct, "M", 2);
        result.current.addItem(mockProduct2, "G", 3);
      });

      expect(result.current.getTotalItems()).toBe(5);
    });

    it("should return 0 for empty cart", () => {
      const { result } = renderHook(() => useCart());

      expect(result.current.getTotalItems()).toBe(0);
    });
  });

  describe("getTotalPrice", () => {
    it("should return total price of all items", () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addItem(mockProduct, "M", 2); // 59.9 * 2 = 119.8
        result.current.addItem(mockProduct2, "G", 1); // 89.9 * 1 = 89.9
      });

      // 119.8 + 89.9 = 209.7
      expect(result.current.getTotalPrice()).toBeCloseTo(209.7, 2);
    });

    it("should return 0 for empty cart", () => {
      const { result } = renderHook(() => useCart());

      expect(result.current.getTotalPrice()).toBe(0);
    });
  });

  describe("persistence", () => {
    it("should persist items to localStorage", () => {
      const { result } = renderHook(() => useCart());

      act(() => {
        result.current.addItem(mockProduct, "M");
      });

      const stored = localStorage.getItem("palestra-baby-cart");
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      expect(parsed.state.items).toHaveLength(1);
    });
  });
});
