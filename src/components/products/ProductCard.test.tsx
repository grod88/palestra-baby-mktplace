import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ProductCard } from "./ProductCard";
import type { Product } from "@/types";

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

// Mock useCart hook
const mockAddItem = vi.fn();
vi.mock("@/hooks/useCart", () => ({
  useCart: () => ({
    addItem: mockAddItem,
  }),
}));

const mockProduct: Product = {
  id: "prod-1",
  name: "Body Verde Palmeiras",
  slug: "body-verde-palmeiras",
  price: 59.9,
  originalPrice: 79.9,
  description: "Body temático do Palmeiras",
  shortDescription: "Body confortável para bebês",
  images: ["/img1.jpg", "/img2.jpg"],
  category: "bodies",
  sizes: ["P", "M", "G"],
  inStock: true,
  featured: true,
  careInstructions: ["Lavar à mão"],
  measurements: { P: "0-3m", M: "3-6m", G: "6-12m" },
};

const mockProductNoDiscount: Product = {
  ...mockProduct,
  id: "prod-2",
  originalPrice: undefined,
  featured: false,
};

function renderWithRouter(component: React.ReactElement) {
  return render(<BrowserRouter>{component}</BrowserRouter>);
}

describe("ProductCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render product name", () => {
    renderWithRouter(<ProductCard product={mockProduct} />);
    expect(screen.getByText("Body Verde Palmeiras")).toBeInTheDocument();
  });

  it("should render product short description", () => {
    renderWithRouter(<ProductCard product={mockProduct} />);
    expect(screen.getByText("Body confortável para bebês")).toBeInTheDocument();
  });

  it("should render product price formatted as BRL", () => {
    renderWithRouter(<ProductCard product={mockProduct} />);
    // formatPrice uses \u00a0 (non-breaking space)
    expect(screen.getByText(/R\$\s*59,90/)).toBeInTheDocument();
  });

  it("should render original price when has discount", () => {
    renderWithRouter(<ProductCard product={mockProduct} />);
    expect(screen.getByText(/R\$\s*79,90/)).toBeInTheDocument();
  });

  it("should render discount badge when has discount", () => {
    renderWithRouter(<ProductCard product={mockProduct} />);
    // 1 - 59.9/79.9 = 0.25 = 25%
    expect(screen.getByText("-25%")).toBeInTheDocument();
  });

  it("should not render discount badge when no discount", () => {
    renderWithRouter(<ProductCard product={mockProductNoDiscount} />);
    expect(screen.queryByText(/-\d+%/)).not.toBeInTheDocument();
  });

  it("should render featured badge when featured and no discount", () => {
    const featuredNoDiscount = { ...mockProduct, originalPrice: undefined };
    renderWithRouter(<ProductCard product={featuredNoDiscount} />);
    expect(screen.getByText("Destaque")).toBeInTheDocument();
  });

  it("should render product image", () => {
    renderWithRouter(<ProductCard product={mockProduct} />);
    const img = screen.getByAltText("Body Verde Palmeiras");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/img1.jpg");
  });

  it("should render sizes", () => {
    renderWithRouter(<ProductCard product={mockProduct} />);
    expect(screen.getByText("P")).toBeInTheDocument();
    expect(screen.getByText("M")).toBeInTheDocument();
    expect(screen.getByText("G")).toBeInTheDocument();
  });

  it("should link to product detail page", () => {
    renderWithRouter(<ProductCard product={mockProduct} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/produto/body-verde-palmeiras");
  });

  it("should call addItem when clicking quick add button", () => {
    renderWithRouter(<ProductCard product={mockProduct} />);

    const addButton = screen.getByRole("button", { name: /adicionar/i });
    fireEvent.click(addButton);

    expect(mockAddItem).toHaveBeenCalledWith(mockProduct, "P"); // First size
  });

  it("should accept index prop for animation delay", () => {
    renderWithRouter(<ProductCard product={mockProduct} index={2} />);
    // Component should render without errors
    expect(screen.getByText("Body Verde Palmeiras")).toBeInTheDocument();
  });

  it("should render only first 4 sizes", () => {
    const productWithManySizes = {
      ...mockProduct,
      sizes: ["RN", "P", "M", "G", "GG", "XG"],
    };
    renderWithRouter(<ProductCard product={productWithManySizes} />);

    expect(screen.getByText("RN")).toBeInTheDocument();
    expect(screen.getByText("P")).toBeInTheDocument();
    expect(screen.getByText("M")).toBeInTheDocument();
    expect(screen.getByText("G")).toBeInTheDocument();
    expect(screen.queryByText("GG")).not.toBeInTheDocument();
    expect(screen.queryByText("XG")).not.toBeInTheDocument();
  });
});
