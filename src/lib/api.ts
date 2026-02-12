/**
 * API layer — queries ao Supabase + mapeamento DB → Frontend types.
 * Todas as funções aqui são "query functions" usadas pelo React Query.
 */
import { supabase } from "@/lib/supabase";
import type { Product, Testimonial, FAQ } from "@/types";
import type { DbProductWithRelations, DbTestimonial, DbFaq } from "@/types/database";

// ─── Mappers (DB → Frontend) ─────────────────────────────────────────────────

function mapProduct(db: DbProductWithRelations): Product {
  const images = db.product_images
    .sort((a, b) => a.position - b.position)
    .map((img) => img.url);

  const sizes = db.product_sizes
    .sort((a, b) => a.size_label.localeCompare(b.size_label))
    .map((s) => s.size_label);

  // Ordenar tamanhos na ordem lógica
  const sizeOrder: Record<string, number> = { RN: 0, P: 1, M: 2, G: 3, GG: 4, "Único": 5 };
  sizes.sort((a, b) => (sizeOrder[a] ?? 99) - (sizeOrder[b] ?? 99));

  const inStock = db.product_sizes.some((s) => s.stock > 0);

  return {
    id: db.id,
    name: db.name,
    slug: db.slug,
    price: Number(db.price),
    originalPrice: db.original_price ? Number(db.original_price) : undefined,
    description: db.description,
    shortDescription: db.short_description,
    images: images.length > 0 ? images : ["/placeholder.svg"],
    category: db.category,
    sizes: sizes.length > 0 ? sizes : ["Único"],
    inStock,
    featured: db.featured,
    careInstructions: db.care_instructions ?? [],
    measurements: (db.measurements as Record<string, string>) ?? {},
  };
}

function mapTestimonial(db: DbTestimonial): Testimonial {
  return {
    id: db.id,
    name: db.name,
    avatar: db.avatar_url || "/placeholder.svg",
    text: db.text,
    rating: db.rating,
  };
}

function mapFaq(db: DbFaq): FAQ {
  return {
    question: db.question,
    answer: db.answer,
  };
}

// ─── Query Functions ─────────────────────────────────────────────────────────

const PRODUCT_SELECT = `
  *,
  product_images ( id, url, alt_text, position ),
  product_sizes  ( id, size_label, stock, sku )
`;

/** Buscar todos os produtos ativos */
export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("active", true)
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Erro ao buscar produtos: ${error.message}`);
  return (data as DbProductWithRelations[]).map(mapProduct);
}

/** Buscar produtos em destaque (featured = true) */
export async function fetchFeaturedProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("active", true)
    .eq("featured", true)
    .order("created_at", { ascending: false })
    .limit(4);

  if (error) throw new Error(`Erro ao buscar destaques: ${error.message}`);
  return (data as DbProductWithRelations[]).map(mapProduct);
}

/** Buscar um produto pelo slug */
export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .eq("active", true)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // not found
    throw new Error(`Erro ao buscar produto: ${error.message}`);
  }
  return mapProduct(data as DbProductWithRelations);
}

/** Buscar testimonials ativos ordenados por posição */
export async function fetchTestimonials(): Promise<Testimonial[]> {
  const { data, error } = await supabase
    .from("testimonials")
    .select("*")
    .eq("active", true)
    .order("position", { ascending: true });

  if (error) throw new Error(`Erro ao buscar depoimentos: ${error.message}`);
  return (data as DbTestimonial[]).map(mapTestimonial);
}

/** Buscar FAQs ativas ordenadas por posição */
export async function fetchFAQs(): Promise<FAQ[]> {
  const { data, error } = await supabase
    .from("faqs")
    .select("*")
    .eq("active", true)
    .order("position", { ascending: true });

  if (error) throw new Error(`Erro ao buscar FAQs: ${error.message}`);
  return (data as DbFaq[]).map(mapFaq);
}

/** Buscar labels de categorias (por enquanto estático, futuro: tabela categories) */
export const categoryLabels: Record<string, string> = {
  bodies: "Bodies",
  conjuntos: "Conjuntos",
  acessorios: "Acessórios",
  kits: "Kits Presente",
};
