import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { Footer } from "./Footer";

function renderWithRouter(component: React.ReactElement) {
  return render(<BrowserRouter>{component}</BrowserRouter>);
}

describe("Footer", () => {
  beforeEach(() => {
    // Mock Date to have consistent year
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-11"));
  });

  it("should render brand name", () => {
    renderWithRouter(<Footer />);
    expect(screen.getAllByText("Palestra Baby")[0]).toBeInTheDocument();
  });

  it("should render brand description", () => {
    renderWithRouter(<Footer />);
    expect(
      screen.getByText(/moda infantil premium para os pequenos palmeirenses/i)
    ).toBeInTheDocument();
  });

  it("should render social media links", () => {
    renderWithRouter(<Footer />);
    // Check that social links exist and have target blank
    const socialLinks = screen.getAllByRole("link");
    const externalLinks = socialLinks.filter(
      (link) => link.getAttribute("target") === "_blank"
    );
    expect(externalLinks.length).toBeGreaterThanOrEqual(2);
  });

  it("should render quick links section", () => {
    renderWithRouter(<Footer />);
    expect(screen.getByText("Links Rápidos")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Produtos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bodies" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Conjuntos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Kits Presente" })).toBeInTheDocument();
  });

  it("should render contact section", () => {
    renderWithRouter(<Footer />);
    expect(screen.getByText("Atendimento")).toBeInTheDocument();
    expect(screen.getByText("(11) 99999-9999")).toBeInTheDocument();
    expect(screen.getByText("contato@palestrababy.com.br")).toBeInTheDocument();
    expect(screen.getByText(/são paulo, sp/i)).toBeInTheDocument();
  });

  it("should render information links", () => {
    renderWithRouter(<Footer />);
    expect(screen.getByText("Informações")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Política de Privacidade" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Termos de Uso" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Trocas e Devoluções" })
    ).toBeInTheDocument();
  });

  it("should render copyright with current year", () => {
    renderWithRouter(<Footer />);
    expect(screen.getByText(/© 2026 palestra baby/i)).toBeInTheDocument();
  });

  it("should render made with love message", () => {
    renderWithRouter(<Footer />);
    expect(screen.getByText(/feito com/i)).toBeInTheDocument();
    expect(screen.getByText(/em são paulo/i)).toBeInTheDocument();
  });

  it("should have correct link hrefs", () => {
    renderWithRouter(<Footer />);

    const produtosLink = screen.getByRole("link", { name: "Produtos" });
    expect(produtosLink).toHaveAttribute("href", "/produtos");

    const bodiesLink = screen.getByRole("link", { name: "Bodies" });
    expect(bodiesLink).toHaveAttribute("href", "/produtos?categoria=bodies");
  });

  it("should render as footer element", () => {
    renderWithRouter(<Footer />);
    expect(document.querySelector("footer")).toBeInTheDocument();
  });
});
