/**
 * Database types — espelham exatamente o schema SQL do Supabase.
 * Gerados manualmente a partir de supabase/schema.sql.
 * Quando o schema mudar, rode `supabase gen types typescript` para regenerar.
 */

// ── Product catalog ──────────────────────────────────────────────────────────

export type ProductCategory = "bodies" | "conjuntos" | "acessorios" | "kits";

export interface DbProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  category: ProductCategory;
  price: number;
  original_price: number | null;
  featured: boolean;
  active: boolean;
  care_instructions: string[];
  measurements: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface DbProductImage {
  id: string;
  product_id: string;
  url: string;
  alt_text: string;
  position: number;
  created_at: string;
}

export interface DbProductSize {
  id: string;
  product_id: string;
  size_label: string;
  stock: number;
  sku: string | null;
  created_at: string;
  updated_at: string;
}

/** Produto com relações (resultado de query com joins) */
export interface DbProductWithRelations extends DbProduct {
  product_images: DbProductImage[];
  product_sizes: DbProductSize[];
}

// ── Content ──────────────────────────────────────────────────────────────────

export interface DbTestimonial {
  id: string;
  name: string;
  avatar_url: string | null;
  text: string;
  rating: number;
  active: boolean;
  position: number;
  created_at: string;
}

export interface DbFaq {
  id: string;
  question: string;
  answer: string;
  position: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Orders ───────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "paid"
  | "preparing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

export type PaymentMethod = "pix" | "credit_card" | "debit_card";
export type ShippingMethod = "pac" | "sedex" | "free";

export interface DbCustomer {
  id: string;
  auth_id: string | null;
  name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  created_at: string;
  updated_at: string;
}
