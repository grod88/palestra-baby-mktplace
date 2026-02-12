import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { Header } from "./Header";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    span: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <span {...props}>{children}</span>
    ),
    nav: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <nav {...props}>{children}</nav>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// Mock useCart hook
const mockOpenCart = vi.fn();
const mockGetTotalItems = vi.fn(() => 0);

vi.mock("@/hooks/useCart", () => ({
  useCart: () => ({
    getTotalItems: mockGetTotalItems,
    openCart: mockOpenCart,
  }),
}));

function renderWithRouter(component: React.ReactElement) {
  return render(<BrowserRouter>{component}</BrowserRouter>);
}

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTotalItems.mockReturnValue(0);
  });

  it("should render logo with brand name", () => {
    renderWithRouter(<Header />);
    expect(screen.getByText("Palestra Baby")).toBeInTheDocument();
  });

  it("should render logo link to home", () => {
    renderWithRouter(<Header />);
    const logoLink = screen.getByRole("link", { name: /palestra baby/i });
    expect(logoLink).toHaveAttribute("href", "/");
  });

  it("should render subtitle", () => {
    renderWithRouter(<Header />);
    expect(screen.getByText("Moda Infantil")).toBeInTheDocument();
  });

  it("should render navigation links", () => {
    renderWithRouter(<Header />);
    expect(screen.getAllByText("Produtos")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Sobre")[0]).toBeInTheDocument();
    expect(screen.getAllByText("Contato")[0]).toBeInTheDocument();
  });

  it("should render cart button", () => {
    renderWithRouter(<Header />);
    const cartButtons = screen.getAllByRole("button");
    const cartButton = cartButtons.find((btn) => btn.querySelector(".lucide-shopping-bag"));
    expect(cartButton).toBeInTheDocument();
  });

  it("should call openCart when cart button is clicked", () => {
    renderWithRouter(<Header />);
    const cartButtons = screen.getAllByRole("button");
    const cartButton = cartButtons.find((btn) => btn.querySelector(".lucide-shopping-bag"));

    if (cartButton) {
      fireEvent.click(cartButton);
      expect(mockOpenCart).toHaveBeenCalledTimes(1);
    }
  });

  it("should show cart item count when items > 0", () => {
    mockGetTotalItems.mockReturnValue(3);
    renderWithRouter(<Header />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("should not show cart count when cart is empty", () => {
    mockGetTotalItems.mockReturnValue(0);
    renderWithRouter(<Header />);
    // Should not have a badge with "0"
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("should render mobile menu button", () => {
    renderWithRouter(<Header />);
    // Mobile menu button should exist
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it("should have correct nav link hrefs", () => {
    renderWithRouter(<Header />);
    const produtosLinks = screen.getAllByText("Produtos");
    const firstProdutosLink = produtosLinks[0].closest("a");
    expect(firstProdutosLink).toHaveAttribute("href", "/produtos");
  });
});
