import { describe, it, expect } from "vitest";
import type { Product, CartItem, CustomerInfo, Address, Testimonial, FAQ } from "./index";

describe("Types", () => {
  describe("Product type", () => {
    it("should allow valid product object", () => {
      const product: Product = {
        id: "1",
        name: "Body Verde",
        slug: "body-verde",
        price: 59.9,
        description: "Descrição completa",
        shortDescription: "Descrição curta",
        images: ["/img.jpg"],
        category: "bodies",
        sizes: ["P", "M", "G"],
        inStock: true,
        featured: true,
        careInstructions: ["Lavar à mão"],
        measurements: { P: "0-3m" },
      };

      expect(product.id).toBe("1");
      expect(product.category).toBe("bodies");
    });

    it("should allow optional originalPrice", () => {
      const product: Product = {
        id: "1",
        name: "Body",
        slug: "body",
        price: 59.9,
        originalPrice: 79.9,
        description: "Desc",
        shortDescription: "Short",
        images: ["/img.jpg"],
        category: "conjuntos",
        sizes: ["M"],
        inStock: true,
        featured: false,
        careInstructions: [],
        measurements: {},
      };

      expect(product.originalPrice).toBe(79.9);
    });

    it("should enforce category enum", () => {
      const validCategories: Product["category"][] = [
        "bodies",
        "conjuntos",
        "acessorios",
        "kits",
      ];

      validCategories.forEach((cat) => {
        expect(["bodies", "conjuntos", "acessorios", "kits"]).toContain(cat);
      });
    });
  });

  describe("CartItem type", () => {
    it("should allow valid cart item", () => {
      const product: Product = {
        id: "1",
        name: "Body",
        slug: "body",
        price: 59.9,
        description: "Desc",
        shortDescription: "Short",
        images: ["/img.jpg"],
        category: "bodies",
        sizes: ["M"],
        inStock: true,
        featured: false,
        careInstructions: [],
        measurements: {},
      };

      const cartItem: CartItem = {
        product,
        quantity: 2,
        size: "M",
      };

      expect(cartItem.quantity).toBe(2);
      expect(cartItem.size).toBe("M");
    });
  });

  describe("CustomerInfo type", () => {
    it("should allow valid customer info", () => {
      const customer: CustomerInfo = {
        name: "João Silva",
        email: "joao@email.com",
        phone: "11999999999",
        cpf: "12345678900",
      };

      expect(customer.name).toBe("João Silva");
      expect(customer.email).toBe("joao@email.com");
    });
  });

  describe("Address type", () => {
    it("should allow valid address", () => {
      const address: Address = {
        cep: "01310100",
        street: "Av Paulista",
        number: "1000",
        complement: "Apto 123",
        neighborhood: "Bela Vista",
        city: "São Paulo",
        state: "SP",
      };

      expect(address.cep).toBe("01310100");
      expect(address.state).toBe("SP");
    });

    it("should allow address without complement", () => {
      const address: Address = {
        cep: "01310100",
        street: "Av Paulista",
        number: "1000",
        neighborhood: "Bela Vista",
        city: "São Paulo",
        state: "SP",
      };

      expect(address.complement).toBeUndefined();
    });
  });

  describe("Testimonial type", () => {
    it("should allow valid testimonial", () => {
      const testimonial: Testimonial = {
        id: "1",
        name: "Maria",
        avatar: "/avatar.jpg",
        text: "Ótimo produto!",
        rating: 5,
      };

      expect(testimonial.rating).toBe(5);
    });
  });

  describe("FAQ type", () => {
    it("should allow valid FAQ", () => {
      const faq: FAQ = {
        question: "Como funciona o frete?",
        answer: "Enviamos para todo Brasil",
      };

      expect(faq.question).toBe("Como funciona o frete?");
    });
  });
});
