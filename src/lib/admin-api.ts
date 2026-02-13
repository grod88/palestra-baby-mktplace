/**
 * Admin API — CRUD operations para o painel administrativo.
 * Todas operações requerem usuário autenticado com role = admin.
 * RLS policies no Supabase garantem segurança server-side.
 */
import { supabase } from "@/lib/supabase";
import type { Product } from "@/types";
import type {
  DbProduct,
  DbProductWithRelations,
  DbProductImage,
  DbProductSize,
  OrderStatus,
} from "@/types/database";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AdminProduct extends Product {
  active: boolean;
  createdAt: string;
  updatedAt: string;
  /** Shipping dimensions */
  weightKg: number;
  heightCm: number;
  widthCm: number;
  lengthCm: number;
  productSizes: Array<{
    id: string;
    sizeLabel: string;
    stock: number;
    sku: string | null;
  }>;
  productImages: Array<{
    id: string;
    url: string;
    altText: string;
    position: number;
  }>;
}

export interface AdminOrder {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  status: OrderStatus;
  paymentMethod: string;
  paymentId: string | null;
  shippingMethod: string;
  shippingPrice: number;
  trackingCode: string | null;
  subtotal: number;
  discountAmount: number;
  total: number;
  customerNotes: string | null;
  adminNotes: string | null;
  shippingAddress: {
    name: string;
    cep: string;
    street: string;
    number: string;
    complement: string | null;
    neighborhood: string;
    city: string;
    state: string;
  };
  items: AdminOrderItem[];
  statusHistory: AdminStatusHistory[];
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
}

export interface AdminOrderItem {
  id: string;
  productId: string;
  productName: string;
  size: string;
  quantity: number;
  unitPrice: number;
}

export interface AdminStatusHistory {
  id: string;
  oldStatus: OrderStatus | null;
  newStatus: OrderStatus;
  changedBy: string | null;
  note: string | null;
  createdAt: string;
}

export interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  lowStockCount: number;
  pendingOrders: number;
  recentOrders: AdminOrder[];
  lowStockItems: Array<{
    productName: string;
    sizeLabel: string;
    stock: number;
  }>;
}

export interface ProductFormData {
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  category: string;
  price: number;
  originalPrice: number | null;
  featured: boolean;
  active: boolean;
  careInstructions: string[];
  measurements: Record<string, string>;
  /** Shipping dimensions (Melhor Envio) */
  weightKg: number;
  heightCm: number;
  widthCm: number;
  lengthCm: number;
}

export interface StockUpdate {
  sizeId: string;
  stock: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PRODUCT_SELECT = `
  *,
  product_images ( id, url, alt_text, position ),
  product_sizes  ( id, size_label, stock, sku )
`;

const ORDER_SELECT = `
  *,
  customers!inner ( name, email, phone ),
  order_items ( id, product_id, product_name, size, quantity, unit_price ),
  order_status_history ( id, old_status, new_status, changed_by, note, created_at )
`;

function mapAdminProduct(db: DbProductWithRelations): AdminProduct {
  const images = db.product_images
    .sort((a, b) => a.position - b.position)
    .map((img) => img.url);

  const sizes = db.product_sizes
    .map((s) => s.size_label);

  const sizeOrder: Record<string, number> = { RN: 0, P: 1, M: 2, G: 3, GG: 4, Unico: 5, "Único": 5 };
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
    sizes,
    inStock,
    featured: db.featured,
    careInstructions: db.care_instructions ?? [],
    measurements: (db.measurements as Record<string, string>) ?? {},
    // Admin extras
    active: db.active,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    weightKg: Number(db.weight_kg) || 0.3,
    heightCm: Number(db.height_cm) || 5,
    widthCm: Number(db.width_cm) || 20,
    lengthCm: Number(db.length_cm) || 25,
    productSizes: db.product_sizes
      .sort((a, b) => (sizeOrder[a.size_label] ?? 99) - (sizeOrder[b.size_label] ?? 99))
      .map((s) => ({
        id: s.id,
        sizeLabel: s.size_label,
        stock: s.stock,
        sku: s.sku,
      })),
    productImages: db.product_images
      .sort((a, b) => a.position - b.position)
      .map((img) => ({
        id: img.id,
        url: img.url,
        altText: img.alt_text,
        position: img.position,
      })),
  };
}

 
function mapAdminOrder(db: any): AdminOrder {
  return {
    id: db.id,
    customerName: db.customers?.name ?? "—",
    customerEmail: db.customers?.email ?? "—",
    customerPhone: db.customers?.phone ?? null,
    status: db.status,
    paymentMethod: db.payment_method,
    paymentId: db.payment_id,
    shippingMethod: db.shipping_method,
    shippingPrice: Number(db.shipping_price),
    trackingCode: db.tracking_code,
    subtotal: Number(db.subtotal),
    discountAmount: Number(db.discount_amount),
    total: Number(db.total),
    customerNotes: db.customer_notes,
    adminNotes: db.admin_notes,
    shippingAddress: {
      name: db.shipping_name,
      cep: db.shipping_cep,
      street: db.shipping_street,
      number: db.shipping_number,
      complement: db.shipping_complement,
      neighborhood: db.shipping_neighborhood,
      city: db.shipping_city,
      state: db.shipping_state,
    },
    items: (db.order_items ?? []).map(
       
      (item: any) => ({
        id: item.id,
        productId: item.product_id,
        productName: item.product_name,
        size: item.size,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
      })
    ),
    statusHistory: (db.order_status_history ?? [])
       
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
       
      .map((h: any) => ({
        id: h.id,
        oldStatus: h.old_status,
        newStatus: h.new_status,
        changedBy: h.changed_by,
        note: h.note,
        createdAt: h.created_at,
      })),
    createdAt: db.created_at,
    updatedAt: db.updated_at,
    paidAt: db.paid_at,
    shippedAt: db.shipped_at,
    deliveredAt: db.delivered_at,
    cancelledAt: db.cancelled_at,
  };
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const [productsRes, ordersRes, lowStockRes, recentOrdersRes] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id, total, status", { count: "exact" }),
    supabase
      .from("product_sizes")
      .select("stock, size_label, product_id, products!inner(name)")
      .lt("stock", 5)
      .order("stock", { ascending: true })
      .limit(10),
    supabase
      .from("orders")
      .select(ORDER_SELECT)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const totalProducts = productsRes.count ?? 0;
  const orders = ordersRes.data ?? [];
  const totalOrders = ordersRes.count ?? 0;
  const totalRevenue = orders.reduce(
    (sum, o) => sum + (["paid", "confirmed", "preparing", "shipped", "delivered"].includes(o.status) ? Number(o.total) : 0),
    0
  );
  const pendingOrders = orders.filter((o) => o.status === "pending").length;

  const lowStockItems = (lowStockRes.data ?? []).map(
     
    (item: any) => ({
      productName: item.products?.name ?? "—",
      sizeLabel: item.size_label,
      stock: item.stock,
    })
  );

  const recentOrders = (recentOrdersRes.data ?? []).map(mapAdminOrder);

  return {
    totalProducts,
    totalOrders,
    totalRevenue,
    lowStockCount: lowStockItems.length,
    pendingOrders,
    recentOrders,
    lowStockItems,
  };
}

// ─── Products CRUD ───────────────────────────────────────────────────────────

/** Lista TODOS os produtos (incluindo inativos) */
export async function fetchAdminProducts(): Promise<AdminProduct[]> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Erro ao buscar produtos: ${error.message}`);
  return (data as DbProductWithRelations[]).map(mapAdminProduct);
}

/** Buscar produto por ID (admin) */
export async function fetchAdminProduct(id: string): Promise<AdminProduct | null> {
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Erro ao buscar produto: ${error.message}`);
  }
  return mapAdminProduct(data as DbProductWithRelations);
}

/** Criar produto */
export async function createProduct(form: ProductFormData): Promise<AdminProduct> {
  const { data, error } = await supabase
    .from("products")
    .insert({
      name: form.name,
      slug: form.slug,
      description: form.description,
      short_description: form.shortDescription,
      category: form.category,
      price: form.price,
      original_price: form.originalPrice,
      featured: form.featured,
      active: form.active,
      care_instructions: form.careInstructions,
      measurements: form.measurements,
      weight_kg: form.weightKg,
      height_cm: form.heightCm,
      width_cm: form.widthCm,
      length_cm: form.lengthCm,
    })
    .select(PRODUCT_SELECT)
    .single();

  if (error) throw new Error(`Erro ao criar produto: ${error.message}`);
  return mapAdminProduct(data as DbProductWithRelations);
}

/** Atualizar produto */
export async function updateProduct(id: string, form: Partial<ProductFormData>): Promise<AdminProduct> {
   
  const updateData: Record<string, any> = {};
  if (form.name !== undefined) updateData.name = form.name;
  if (form.slug !== undefined) updateData.slug = form.slug;
  if (form.description !== undefined) updateData.description = form.description;
  if (form.shortDescription !== undefined) updateData.short_description = form.shortDescription;
  if (form.category !== undefined) updateData.category = form.category;
  if (form.price !== undefined) updateData.price = form.price;
  if (form.originalPrice !== undefined) updateData.original_price = form.originalPrice;
  if (form.featured !== undefined) updateData.featured = form.featured;
  if (form.active !== undefined) updateData.active = form.active;
  if (form.careInstructions !== undefined) updateData.care_instructions = form.careInstructions;
  if (form.measurements !== undefined) updateData.measurements = form.measurements;
  if (form.weightKg !== undefined) updateData.weight_kg = form.weightKg;
  if (form.heightCm !== undefined) updateData.height_cm = form.heightCm;
  if (form.widthCm !== undefined) updateData.width_cm = form.widthCm;
  if (form.lengthCm !== undefined) updateData.length_cm = form.lengthCm;

  const { data, error } = await supabase
    .from("products")
    .update(updateData)
    .eq("id", id)
    .select(PRODUCT_SELECT)
    .single();

  if (error) throw new Error(`Erro ao atualizar produto: ${error.message}`);
  return mapAdminProduct(data as DbProductWithRelations);
}

/** Deletar produto (soft delete — active = false) */
export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase
    .from("products")
    .update({ active: false })
    .eq("id", id);

  if (error) throw new Error(`Erro ao desativar produto: ${error.message}`);
}

/** Restaurar produto (active = true) */
export async function restoreProduct(id: string): Promise<void> {
  const { error } = await supabase
    .from("products")
    .update({ active: true })
    .eq("id", id);

  if (error) throw new Error(`Erro ao restaurar produto: ${error.message}`);
}

// ─── Product Sizes / Stock ───────────────────────────────────────────────────

/** Adicionar tamanho a um produto */
export async function addProductSize(
  productId: string,
  sizeLabel: string,
  stock: number,
  sku?: string
): Promise<DbProductSize> {
  const { data, error } = await supabase
    .from("product_sizes")
    .insert({ product_id: productId, size_label: sizeLabel, stock, sku: sku || null })
    .select()
    .single();

  if (error) throw new Error(`Erro ao adicionar tamanho: ${error.message}`);
  return data as DbProductSize;
}

/** Atualizar estoque de um tamanho */
export async function updateStock(sizeId: string, stock: number): Promise<void> {
  const { error } = await supabase
    .from("product_sizes")
    .update({ stock })
    .eq("id", sizeId);

  if (error) throw new Error(`Erro ao atualizar estoque: ${error.message}`);
}

/** Atualizar estoque em lote */
export async function batchUpdateStock(updates: StockUpdate[]): Promise<void> {
  const promises = updates.map(({ sizeId, stock }) =>
    supabase.from("product_sizes").update({ stock }).eq("id", sizeId)
  );
  const results = await Promise.all(promises);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(`Erro ao atualizar estoque: ${failed.error.message}`);
}

/** Remover tamanho */
export async function deleteProductSize(sizeId: string): Promise<void> {
  const { error } = await supabase
    .from("product_sizes")
    .delete()
    .eq("id", sizeId);

  if (error) throw new Error(`Erro ao remover tamanho: ${error.message}`);
}

// ─── Product Images ──────────────────────────────────────────────────────────

/** Adicionar imagem */
export async function addProductImage(
  productId: string,
  url: string,
  altText: string,
  position: number
): Promise<DbProductImage> {
  const { data, error } = await supabase
    .from("product_images")
    .insert({ product_id: productId, url, alt_text: altText, position })
    .select()
    .single();

  if (error) throw new Error(`Erro ao adicionar imagem: ${error.message}`);
  return data as DbProductImage;
}

/** Remover imagem */
export async function deleteProductImage(imageId: string): Promise<void> {
  const { error } = await supabase
    .from("product_images")
    .delete()
    .eq("id", imageId);

  if (error) throw new Error(`Erro ao remover imagem: ${error.message}`);
}

// ─── Orders ──────────────────────────────────────────────────────────────────

/** Lista todos os pedidos */
export async function fetchAdminOrders(): Promise<AdminOrder[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Erro ao buscar pedidos: ${error.message}`);
  return (data ?? []).map(mapAdminOrder);
}

/** Buscar pedido por ID */
export async function fetchAdminOrder(id: string): Promise<AdminOrder | null> {
  const { data, error } = await supabase
    .from("orders")
    .select(ORDER_SELECT)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Erro ao buscar pedido: ${error.message}`);
  }
  return mapAdminOrder(data);
}

/** Atualizar status de um pedido */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  note?: string
): Promise<void> {
  // Buscar status atual
  const { data: current, error: fetchError } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single();

  if (fetchError) throw new Error(`Erro ao buscar pedido: ${fetchError.message}`);

  const oldStatus = current.status as OrderStatus;

  // Atualizar status
   
  const updateData: Record<string, any> = { status: newStatus };

  // Marcar timestamps relevantes
  if (newStatus === "paid" || newStatus === "confirmed") updateData.paid_at = new Date().toISOString();
  if (newStatus === "shipped") updateData.shipped_at = new Date().toISOString();
  if (newStatus === "delivered") updateData.delivered_at = new Date().toISOString();
  if (newStatus === "cancelled") updateData.cancelled_at = new Date().toISOString();

  const { error: updateError } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", orderId);

  if (updateError) throw new Error(`Erro ao atualizar pedido: ${updateError.message}`);

  // Inserir no histórico de status
  const { error: historyError } = await supabase
    .from("order_status_history")
    .insert({
      order_id: orderId,
      old_status: oldStatus,
      new_status: newStatus,
      note: note || null,
    });

  if (historyError) console.error("Erro ao salvar histórico:", historyError.message);
}

/** Atualizar notas admin de um pedido */
export async function updateOrderNotes(orderId: string, notes: string): Promise<void> {
  const { error } = await supabase
    .from("orders")
    .update({ admin_notes: notes })
    .eq("id", orderId);

  if (error) throw new Error(`Erro ao atualizar notas: ${error.message}`);
}

/** Atualizar código de rastreio */
export async function updateTrackingCode(orderId: string, trackingCode: string): Promise<void> {
  const { error } = await supabase
    .from("orders")
    .update({ tracking_code: trackingCode })
    .eq("id", orderId);

  if (error) throw new Error(`Erro ao atualizar rastreio: ${error.message}`);
}

// ─── Coupons CRUD ────────────────────────────────────────────────────────────

export interface AdminCoupon {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderValue: number | null;
  maxUses: number | null;
  usedCount: number;
  category: string | null;
  startsAt: string;
  expiresAt: string | null;
  active: boolean;
  createdAt: string;
}

export interface CouponFormData {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderValue: number | null;
  maxUses: number | null;
  category: string | null;
  startsAt: string;
  expiresAt: string | null;
  active: boolean;
}

function mapCoupon(db: any): AdminCoupon {
  return {
    id: db.id,
    code: db.code,
    discountType: db.discount_type,
    discountValue: Number(db.discount_value),
    minOrderValue: db.min_order_value ? Number(db.min_order_value) : null,
    maxUses: db.max_uses,
    usedCount: db.used_count,
    category: db.category,
    startsAt: db.starts_at,
    expiresAt: db.expires_at,
    active: db.active,
    createdAt: db.created_at,
  };
}

/** Listar todos os cupons */
export async function fetchCoupons(): Promise<AdminCoupon[]> {
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Erro ao buscar cupons: ${error.message}`);
  return (data ?? []).map(mapCoupon);
}

/** Buscar cupom por ID */
export async function fetchCouponById(id: string): Promise<AdminCoupon> {
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(`Erro ao buscar cupom: ${error.message}`);
  return mapCoupon(data);
}

/** Criar cupom */
export async function createCoupon(form: CouponFormData): Promise<AdminCoupon> {
  const { data, error } = await supabase
    .from("coupons")
    .insert({
      code: form.code.toUpperCase().trim(),
      discount_type: form.discountType,
      discount_value: form.discountValue,
      min_order_value: form.minOrderValue,
      max_uses: form.maxUses,
      category: form.category,
      starts_at: form.startsAt,
      expires_at: form.expiresAt,
      active: form.active,
    })
    .select()
    .single();

  if (error) throw new Error(`Erro ao criar cupom: ${error.message}`);
  return mapCoupon(data);
}

/** Atualizar cupom */
export async function updateCoupon(id: string, form: Partial<CouponFormData>): Promise<AdminCoupon> {
  const updateData: Record<string, any> = {};
  if (form.code !== undefined) updateData.code = form.code.toUpperCase().trim();
  if (form.discountType !== undefined) updateData.discount_type = form.discountType;
  if (form.discountValue !== undefined) updateData.discount_value = form.discountValue;
  if (form.minOrderValue !== undefined) updateData.min_order_value = form.minOrderValue;
  if (form.maxUses !== undefined) updateData.max_uses = form.maxUses;
  if (form.category !== undefined) updateData.category = form.category;
  if (form.startsAt !== undefined) updateData.starts_at = form.startsAt;
  if (form.expiresAt !== undefined) updateData.expires_at = form.expiresAt;
  if (form.active !== undefined) updateData.active = form.active;

  const { data, error } = await supabase
    .from("coupons")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Erro ao atualizar cupom: ${error.message}`);
  return mapCoupon(data);
}

/** Deletar cupom (hard delete) */
export async function deleteCoupon(id: string): Promise<void> {
  const { error } = await supabase
    .from("coupons")
    .delete()
    .eq("id", id);

  if (error) throw new Error(`Erro ao excluir cupom: ${error.message}`);
}

/** Ativar/desativar cupom */
export async function toggleCouponActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase
    .from("coupons")
    .update({ active })
    .eq("id", id);

  if (error) throw new Error(`Erro ao ${active ? "ativar" : "desativar"} cupom: ${error.message}`);
}
