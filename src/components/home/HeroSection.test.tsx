import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { HeroSection } from "./HeroSection";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<object>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

function renderWithRouter(component: React.ReactElement) {
  return render(<BrowserRouter>{component}</BrowserRouter>);
}

describe("HeroSection", () => {
  it("should render main heading", () => {
    renderWithRouter(<HeroSection />);
    expect(screen.getByText(/conforto, carinho e/i)).toBeInTheDocument();
    expect(screen.getByText("estilo")).toBeInTheDocument();
    expect(screen.getByText(/para o seu bebê/i)).toBeInTheDocument();
  });

  it("should render new collection badge", () => {
    renderWithRouter(<HeroSection />);
    expect(screen.getByText("Nova Coleção Disponível")).toBeInTheDocument();
  });

  it("should render description text", () => {
    renderWithRouter(<HeroSection />);
    expect(
      screen.getByText(/roupinhas premium para os pequenos palmeirenses/i)
    ).toBeInTheDocument();
  });

  it("should render CTA button linking to products", () => {
    renderWithRouter(<HeroSection />);
    const ctaButton = screen.getByRole("link", { name: /ver coleção/i });
    expect(ctaButton).toBeInTheDocument();
    expect(ctaButton).toHaveAttribute("href", "/produtos");
  });

  it("should render WhatsApp button", () => {
    renderWithRouter(<HeroSection />);
    const whatsappLink = screen.getByRole("link", { name: /falar no whatsapp/i });
    expect(whatsappLink).toBeInTheDocument();
    expect(whatsappLink).toHaveAttribute("target", "_blank");
    expect(whatsappLink).toHaveAttribute("href", expect.stringContaining("wa.me"));
  });

  it("should render trust badges", () => {
    renderWithRouter(<HeroSection />);
    expect(screen.getByText("4.9")).toBeInTheDocument();
    expect(screen.getByText(/de avaliação/i)).toBeInTheDocument();
    expect(screen.getByText("500+")).toBeInTheDocument();
    expect(screen.getByText(/mamães felizes/i)).toBeInTheDocument();
  });

  it("should render hero image placeholder", () => {
    renderWithRouter(<HeroSection />);
    const img = screen.getByAltText(/bebê feliz/i);
    expect(img).toBeInTheDocument();
  });

  it("should render floating product cards", () => {
    renderWithRouter(<HeroSection />);
    expect(screen.getByText("Body Listrado")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*59,90/)).toBeInTheDocument();
    expect(screen.getByText("Kit Presente")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*199,90/)).toBeInTheDocument();
  });
});
