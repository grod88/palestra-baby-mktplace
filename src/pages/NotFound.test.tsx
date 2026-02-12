import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import NotFound from "./NotFound";

describe("NotFound Page", () => {
  it("should render 404 heading", () => {
    render(
      <BrowserRouter>
        <NotFound />
      </BrowserRouter>
    );
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("should render error message", () => {
    render(
      <BrowserRouter>
        <NotFound />
      </BrowserRouter>
    );
    expect(screen.getByText(/página não encontrada/i)).toBeInTheDocument();
  });

  it("should render link to home", () => {
    render(
      <BrowserRouter>
        <NotFound />
      </BrowserRouter>
    );
    const homeLink = screen.getByRole("link", { name: /voltar ao início/i });
    expect(homeLink).toBeInTheDocument();
    expect(homeLink).toHaveAttribute("href", "/");
  });

  it("should log error to console on mount", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={["/unknown-route"]}>
        <NotFound />
      </MemoryRouter>
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      "404 Error: User attempted to access non-existent route:",
      "/unknown-route"
    );

    consoleSpy.mockRestore();
  });

  it("should have centered content", () => {
    render(
      <BrowserRouter>
        <NotFound />
      </BrowserRouter>
    );
    const container = screen.getByText("404").closest("div");
    expect(container).toHaveClass("text-center");
  });
});
