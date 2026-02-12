import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  customerSchema,
  addressSchema,
  checkoutItemSchema,
  checkoutSchema,
  getShippingPrice,
  calculateTotals,
  calculateCouponDiscount,
  fetchAddressByCep,
  SHIPPING_OPTIONS,
  type CouponResult,
} from "./checkout-api";

describe("Zod Schemas", () => {
  describe("customerSchema", () => {
    it("should validate valid customer data", () => {
      const validCustomer = {
        name: "João Silva",
        email: "joao@email.com",
        phone: "(11) 99999-9999",
        cpf: "123.456.789-00",
      };

      const result = customerSchema.safeParse(validCustomer);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.phone).toBe("11999999999"); // transformed
        expect(result.data.cpf).toBe("12345678900"); // transformed
      }
    });

    it("should reject short name", () => {
      const result = customerSchema.safeParse({
        name: "Jo",
        email: "joao@email.com",
        phone: "(11) 99999-9999",
        cpf: "123.456.789-00",
      });

      expect(result.success).toBe(false);
    });

    it("should reject invalid email", () => {
      const result = customerSchema.safeParse({
        name: "João Silva",
        email: "invalid-email",
        phone: "(11) 99999-9999",
        cpf: "123.456.789-00",
      });

      expect(result.success).toBe(false);
    });

    it("should reject invalid phone", () => {
      const result = customerSchema.safeParse({
        name: "João Silva",
        email: "joao@email.com",
        phone: "123",
        cpf: "123.456.789-00",
      });

      expect(result.success).toBe(false);
    });

    it("should reject invalid CPF", () => {
      const result = customerSchema.safeParse({
        name: "João Silva",
        email: "joao@email.com",
        phone: "(11) 99999-9999",
        cpf: "12345",
      });

      expect(result.success).toBe(false);
    });

    it("should accept phone without formatting", () => {
      const result = customerSchema.safeParse({
        name: "João Silva",
        email: "joao@email.com",
        phone: "11999999999",
        cpf: "12345678900",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("addressSchema", () => {
    it("should validate valid address", () => {
      const validAddress = {
        cep: "01310-100",
        street: "Avenida Paulista",
        number: "1000",
        complement: "Apto 123",
        neighborhood: "Bela Vista",
        city: "São Paulo",
        state: "sp",
      };

      const result = addressSchema.safeParse(validAddress);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cep).toBe("01310100"); // transformed
        expect(result.data.state).toBe("SP"); // transformed to uppercase
      }
    });

    it("should reject invalid CEP", () => {
      const result = addressSchema.safeParse({
        cep: "123",
        street: "Rua Teste",
        number: "100",
        neighborhood: "Centro",
        city: "São Paulo",
        state: "SP",
      });

      expect(result.success).toBe(false);
    });

    it("should reject invalid state (wrong length)", () => {
      const result = addressSchema.safeParse({
        cep: "01310-100",
        street: "Rua Teste",
        number: "100",
        neighborhood: "Centro",
        city: "São Paulo",
        state: "São Paulo",
      });

      expect(result.success).toBe(false);
    });

    it("should make complement optional with default empty string", () => {
      const result = addressSchema.safeParse({
        cep: "01310-100",
        street: "Rua Teste",
        number: "100",
        neighborhood: "Centro",
        city: "São Paulo",
        state: "SP",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.complement).toBe("");
      }
    });
  });

  describe("checkoutItemSchema", () => {
    it("should validate valid item", () => {
      const result = checkoutItemSchema.safeParse({
        productId: "550e8400-e29b-41d4-a716-446655440000",
        productName: "Body Verde",
        size: "M",
        quantity: 2,
        unitPrice: 59.9,
      });

      expect(result.success).toBe(true);
    });

    it("should reject invalid UUID", () => {
      const result = checkoutItemSchema.safeParse({
        productId: "not-a-uuid",
        productName: "Body Verde",
        size: "M",
        quantity: 2,
        unitPrice: 59.9,
      });

      expect(result.success).toBe(false);
    });

    it("should reject zero quantity", () => {
      const result = checkoutItemSchema.safeParse({
        productId: "550e8400-e29b-41d4-a716-446655440000",
        productName: "Body Verde",
        size: "M",
        quantity: 0,
        unitPrice: 59.9,
      });

      expect(result.success).toBe(false);
    });

    it("should reject negative price", () => {
      const result = checkoutItemSchema.safeParse({
        productId: "550e8400-e29b-41d4-a716-446655440000",
        productName: "Body Verde",
        size: "M",
        quantity: 1,
        unitPrice: -10,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("checkoutSchema", () => {
    const validCheckout = {
      customer: {
        name: "João Silva",
        email: "joao@email.com",
        phone: "(11) 99999-9999",
        cpf: "123.456.789-00",
      },
      address: {
        cep: "01310-100",
        street: "Av Paulista",
        number: "1000",
        neighborhood: "Bela Vista",
        city: "São Paulo",
        state: "SP",
      },
      shippingMethod: "pac" as const,
      paymentMethod: "pix" as const,
      items: [
        {
          productId: "550e8400-e29b-41d4-a716-446655440000",
          productName: "Body",
          size: "M",
          quantity: 1,
          unitPrice: 59.9,
        },
      ],
    };

    it("should validate complete checkout", () => {
      const result = checkoutSchema.safeParse(validCheckout);
      expect(result.success).toBe(true);
    });

    it("should reject empty items array", () => {
      const result = checkoutSchema.safeParse({
        ...validCheckout,
        items: [],
      });

      expect(result.success).toBe(false);
    });

    it("should reject invalid shipping method", () => {
      const result = checkoutSchema.safeParse({
        ...validCheckout,
        shippingMethod: "express",
      });

      expect(result.success).toBe(false);
    });

    it("should reject invalid payment method", () => {
      const result = checkoutSchema.safeParse({
        ...validCheckout,
        paymentMethod: "bitcoin",
      });

      expect(result.success).toBe(false);
    });

    it("should accept optional couponCode", () => {
      const result = checkoutSchema.safeParse({
        ...validCheckout,
        couponCode: "DESCONTO10",
      });

      expect(result.success).toBe(true);
    });

    it("should accept optional customerNotes", () => {
      const result = checkoutSchema.safeParse({
        ...validCheckout,
        customerNotes: "Presente para bebê",
      });

      expect(result.success).toBe(true);
    });
  });
});

describe("SHIPPING_OPTIONS", () => {
  it("should have pac, sedex, and free options", () => {
    expect(SHIPPING_OPTIONS).toHaveLength(3);
    expect(SHIPPING_OPTIONS.map((o) => o.id)).toEqual(["pac", "sedex", "free"]);
  });

  it("should have correct prices", () => {
    const pac = SHIPPING_OPTIONS.find((o) => o.id === "pac");
    const sedex = SHIPPING_OPTIONS.find((o) => o.id === "sedex");
    const free = SHIPPING_OPTIONS.find((o) => o.id === "free");

    expect(pac?.price).toBe(15.9);
    expect(sedex?.price).toBe(29.9);
    expect(free?.price).toBe(0);
  });
});

describe("getShippingPrice", () => {
  it("should return PAC price", () => {
    expect(getShippingPrice("pac", 100)).toBe(15.9);
  });

  it("should return SEDEX price", () => {
    expect(getShippingPrice("sedex", 100)).toBe(29.9);
  });

  it("should return free for free shipping when subtotal >= 150", () => {
    expect(getShippingPrice("free", 150)).toBe(0);
    expect(getShippingPrice("free", 200)).toBe(0);
  });

  it("should fallback to PAC for free shipping when subtotal < 150", () => {
    expect(getShippingPrice("free", 100)).toBe(15.9);
    expect(getShippingPrice("free", 149.99)).toBe(15.9);
  });

  it("should return PAC price for unknown method", () => {
    expect(getShippingPrice("unknown", 100)).toBe(15.9);
  });
});

describe("calculateTotals", () => {
  it("should calculate totals correctly for PAC + PIX", () => {
    const totals = calculateTotals(100, "pac", "pix", 0);

    expect(totals.subtotal).toBe(100);
    expect(totals.shippingPrice).toBe(15.9);
    expect(totals.discountAmount).toBe(0);
    expect(totals.pixDiscount).toBeCloseTo(5.795, 2); // 5% of 115.9
    expect(totals.total).toBeCloseTo(110.105, 2); // 115.9 - 5.795
  });

  it("should calculate totals without PIX discount for card", () => {
    const totals = calculateTotals(100, "pac", "credit_card", 0);

    expect(totals.pixDiscount).toBe(0);
    expect(totals.total).toBe(115.9); // 100 + 15.9
  });

  it("should apply coupon discount", () => {
    const totals = calculateTotals(100, "pac", "credit_card", 10);

    expect(totals.discountAmount).toBe(10);
    expect(totals.total).toBe(105.9); // 100 + 15.9 - 10
  });

  it("should apply both coupon and PIX discount", () => {
    const totals = calculateTotals(100, "pac", "pix", 10);

    // subtotal: 100, shipping: 15.9, coupon: 10
    // beforeDiscount: 100 + 15.9 - 10 = 105.9
    // pixDiscount: 105.9 * 0.05 = 5.295
    // total: 105.9 - 5.295 = 100.605
    expect(totals.pixDiscount).toBeCloseTo(5.295, 2);
    expect(totals.total).toBeCloseTo(100.605, 2);
  });

  it("should handle free shipping", () => {
    const totals = calculateTotals(200, "free", "credit_card", 0);

    expect(totals.shippingPrice).toBe(0);
    expect(totals.total).toBe(200);
  });

  it("should never return negative total", () => {
    const totals = calculateTotals(10, "pac", "credit_card", 100);

    expect(totals.total).toBeGreaterThanOrEqual(0);
  });
});

describe("calculateCouponDiscount", () => {
  it("should calculate percentage discount", () => {
    const coupon: CouponResult = {
      id: "1",
      code: "DESC10",
      discountType: "percentage",
      discountValue: 10,
      minOrderValue: null,
    };

    expect(calculateCouponDiscount(coupon, 100)).toBe(10);
    expect(calculateCouponDiscount(coupon, 150)).toBe(15);
  });

  it("should calculate fixed discount", () => {
    const coupon: CouponResult = {
      id: "1",
      code: "MENOS20",
      discountType: "fixed",
      discountValue: 20,
      minOrderValue: null,
    };

    expect(calculateCouponDiscount(coupon, 100)).toBe(20);
  });

  it("should cap fixed discount at subtotal", () => {
    const coupon: CouponResult = {
      id: "1",
      code: "MENOS100",
      discountType: "fixed",
      discountValue: 100,
      minOrderValue: null,
    };

    expect(calculateCouponDiscount(coupon, 50)).toBe(50);
  });

  it("should round percentage discount to 2 decimals", () => {
    const coupon: CouponResult = {
      id: "1",
      code: "DESC15",
      discountType: "percentage",
      discountValue: 15,
      minOrderValue: null,
    };

    // 15% of 59.9 = 8.985 -> should be 8.99
    const discount = calculateCouponDiscount(coupon, 59.9);
    expect(discount).toBeCloseTo(8.99, 2);
  });
});

describe("fetchAddressByCep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null for invalid CEP length", async () => {
    const result = await fetchAddressByCep("123");
    expect(result).toBeNull();
  });

  it("should clean CEP before fetching", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          cep: "01310-100",
          logradouro: "Avenida Paulista",
          bairro: "Bela Vista",
          localidade: "São Paulo",
          uf: "SP",
        }),
    });

    const result = await fetchAddressByCep("01310-100");

    expect(global.fetch).toHaveBeenCalledWith(
      "https://viacep.com.br/ws/01310100/json/"
    );
    expect(result).not.toBeNull();
  });

  it("should return address data on success", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          cep: "01310-100",
          logradouro: "Avenida Paulista",
          bairro: "Bela Vista",
          localidade: "São Paulo",
          uf: "SP",
        }),
    });

    const result = await fetchAddressByCep("01310100");

    expect(result).toEqual({
      cep: "01310-100",
      logradouro: "Avenida Paulista",
      bairro: "Bela Vista",
      localidade: "São Paulo",
      uf: "SP",
    });
  });

  it("should return null when CEP not found", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ erro: true }),
    });

    const result = await fetchAddressByCep("00000000");
    expect(result).toBeNull();
  });

  it("should return null on fetch error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const result = await fetchAddressByCep("01310100");
    expect(result).toBeNull();
  });
});
