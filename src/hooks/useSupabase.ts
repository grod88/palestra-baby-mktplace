/**
 * React Query hooks para dados do Supabase.
 * Cada hook encapsula uma query com cache, staleTime e error handling.
 */
import { useQuery } from "@tanstack/react-query";
import {
  fetchProducts,
  fetchFeaturedProducts,
  fetchProductBySlug,
  fetchTestimonials,
  fetchFAQs,
} from "@/lib/api";

/** Todos os produtos ativos */
export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: fetchProducts,
  });
}

/** Produtos em destaque (featured) — usado na home */
export function useFeaturedProducts() {
  return useQuery({
    queryKey: ["products", "featured"],
    queryFn: fetchFeaturedProducts,
  });
}

/** Produto por slug — usado na página de detalhe */
export function useProduct(slug: string | undefined) {
  return useQuery({
    queryKey: ["products", "slug", slug],
    queryFn: () => fetchProductBySlug(slug!),
    enabled: !!slug,
  });
}

/** Testimonials ativos */
export function useTestimonials() {
  return useQuery({
    queryKey: ["testimonials"],
    queryFn: fetchTestimonials,
  });
}

/** FAQs ativas */
export function useFAQs() {
  return useQuery({
    queryKey: ["faqs"],
    queryFn: fetchFAQs,
  });
}
