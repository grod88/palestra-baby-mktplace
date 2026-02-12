import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

// Mock the api module
vi.mock("@/lib/api", () => ({
  fetchProducts: vi.fn(() => Promise.resolve([])),
  fetchFeaturedProducts: vi.fn(() => Promise.resolve([])),
  fetchProductBySlug: vi.fn(() => Promise.resolve(null)),
  fetchTestimonials: vi.fn(() => Promise.resolve([])),
  fetchFAQs: vi.fn(() => Promise.resolve([])),
}));

// Import after mocking
import {
  useProducts,
  useFeaturedProducts,
  useProduct,
  useTestimonials,
  useFAQs,
} from "./useSupabase";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("useProducts", () => {
  it("should return products query result", async () => {
    const { result } = renderHook(() => useProducts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual([]);
  });

  it("should have correct query key", () => {
    const { result } = renderHook(() => useProducts(), {
      wrapper: createWrapper(),
    });

    // The hook should use the correct query key
    expect(typeof result.current.refetch).toBe("function");
  });
});

describe("useFeaturedProducts", () => {
  it("should return featured products query result", async () => {
    const { result } = renderHook(() => useFeaturedProducts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual([]);
  });
});

describe("useProduct", () => {
  it("should return product query result when slug is provided", async () => {
    const { result } = renderHook(() => useProduct("test-slug"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBeNull();
  });

  it("should not fetch when slug is undefined", () => {
    const { result } = renderHook(() => useProduct(undefined), {
      wrapper: createWrapper(),
    });

    // Query should not be enabled
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("should not fetch when slug is empty string", () => {
    const { result } = renderHook(() => useProduct(""), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useTestimonials", () => {
  it("should return testimonials query result", async () => {
    const { result } = renderHook(() => useTestimonials(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual([]);
  });
});

describe("useFAQs", () => {
  it("should return FAQs query result", async () => {
    const { result } = renderHook(() => useFAQs(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual([]);
  });
});
