/**
 * Checkout API — Validação com Zod + chamada à Edge Function process-order.
 * O frontend NUNCA acessa o access_token do Mercado Pago.
 * Tudo passa pela Edge Function que usa service_role + MP server-side.
 */
import { z } from "zod";
import { supabase } from "@/lib/supabase";

// ─── Validation Schemas ──────────────────────────────────────────────────────

export const customerSchema = z.object({
  name: z
    .string()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .max(100, "Nome muito longo"),
  email: z.string().email("E-mail inválido"),
  phone: z
    .string()
    .regex(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/, "Telefone inválido")
    .transform((v) => v.replaceAll(/\D/g, "")),
  cpf: z
    .string()
    .regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, "CPF inválido")
    .transform((v) => v.replaceAll(/\D/g, "")),
});

export const addressSchema = z.object({
  cep: z
    .string()
    .regex(/^\d{5}-?\d{3}$/, "CEP inválido")
    .transform((v) => v.replaceAll(/\D/g, "")),
  street: z.string().min(3, "Rua obrigatória"),
  number: z.string().min(1, "Número obrigatório"),
  complement: z.string().optional().default(""),
  neighborhood: z.string().min(2, "Bairro obrigatório"),
  city: z.string().min(2, "Cidade obrigatória"),
  state: z
    .string()
    .length(2, "UF deve ter 2 caracteres")
    .transform((v) => v.toUpperCase()),
});

export const checkoutItemSchema = z.object({
  productId: z.string().uuid(),
  productName: z.string(),
  size: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().positive(),
});

export const checkoutSchema = z.object({
  customer: customerSchema,
  address: addressSchema,
  shippingMethod: z.enum(["pac", "sedex", "free"]),
  paymentMethod: z.enum(["pix", "credit_card"]),
  items: z.array(checkoutItemSchema).min(1, "Carrinho vazio"),
  couponCode: z.string().optional(),
  customerNotes: z.string().optional(),
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type CheckoutFormData = z.infer<typeof checkoutSchema>;
export type CustomerFormData = z.infer<typeof customerSchema>;
export type AddressFormData = z.infer<typeof addressSchema>;

export interface CheckoutResult {
  orderId: string;
  status: string;
  paymentMethod: string;
  /** URL de redirecionamento para pagamento (Mercado Pago checkout) */
  paymentUrl: string;
  /** Para PIX: código copia-e-cola */
  pixQrCode?: string;
  /** Para PIX: base64 da imagem QR */
  pixQrCodeBase64?: string;
  /** Valores finais */
  subtotal: number;
  shippingPrice: number;
  discountAmount: number;
  total: number;
}

// ─── Shipping ────────────────────────────────────────────────────────────────

export const SHIPPING_OPTIONS = [
  { id: "pac" as const, name: "PAC", price: 15.9, days: "8-12 dias úteis" },
  { id: "sedex" as const, name: "SEDEX", price: 29.9, days: "3-5 dias úteis" },
  {
    id: "free" as const,
    name: "Frete Grátis",
    price: 0,
    days: "10-15 dias úteis",
    minValue: 150,
  },
] as const;

export function getShippingPrice(
  method: string,
  subtotal: number
): number {
  if (method === "free" && subtotal >= 150) return 0;
  if (method === "free" && subtotal < 150) return 15.9; // fallback to PAC
  const option = SHIPPING_OPTIONS.find((o) => o.id === method);
  return option?.price ?? 15.9;
}

export function calculateTotals(
  subtotal: number,
  shippingMethod: string,
  paymentMethod: string,
  discountAmount = 0
) {
  const shippingPrice = getShippingPrice(shippingMethod, subtotal);
  const beforeDiscount = subtotal + shippingPrice - discountAmount;
  const pixDiscount = paymentMethod === "pix" ? beforeDiscount * 0.05 : 0;
  const total = beforeDiscount - pixDiscount;

  return {
    subtotal,
    shippingPrice,
    discountAmount,
    pixDiscount,
    total: Math.max(total, 0),
  };
}

// ─── API Call ────────────────────────────────────────────────────────────────

/**
 * Envia o pedido para a Edge Function `process-order`.
 * A Edge Function:
 * 1. Valida o carrinho (verifica estoque + preços reais)
 * 2. Cria/encontra customer
 * 3. Cria order + order_items (snapshot de preços)
 * 4. Decrementa estoque atomicamente
 * 5. Cria preferência no Mercado Pago
 * 6. Retorna URL de pagamento + dados do pedido
 */
export async function processOrder(
  data: CheckoutFormData
): Promise<CheckoutResult> {
  const { data: result, error } = await supabase.functions.invoke(
    "process-order",
    {
      body: data,
    }
  );

  if (error) {
    throw new Error(
      error.message || "Erro ao processar pedido. Tente novamente."
    );
  }

  if (!result || result.error) {
    throw new Error(
      result?.error || "Erro ao processar pedido. Tente novamente."
    );
  }

  return result as CheckoutResult;
}

// ─── ViaCEP ──────────────────────────────────────────────────────────────────

export interface ViaCepResult {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export async function fetchAddressByCep(
  cep: string
): Promise<ViaCepResult | null> {
  const cleanCep = cep.replaceAll(/\D/g, "");
  if (cleanCep.length !== 8) return null;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data: ViaCepResult = await response.json();
    if (data.erro) return null;
    return data;
  } catch {
    return null;
  }
}

// ─── Coupon validation ──────────────────────────────────────────────────────

export interface CouponResult {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderValue: number | null;
}

export async function validateCoupon(
  code: string,
  subtotal: number
): Promise<CouponResult> {
  const { data, error } = await supabase
    .from("coupons")
    .select("id, code, discount_type, discount_value, min_order_value, max_uses, used_count")
    .ilike("code", code)
    .eq("active", true)
    .single();

  if (error || !data) {
    throw new Error("Cupom inválido ou expirado");
  }

  if (data.max_uses && data.used_count >= data.max_uses) {
    throw new Error("Cupom esgotado");
  }

  if (data.min_order_value && subtotal < data.min_order_value) {
    throw new Error(
      `Pedido mínimo de R$ ${data.min_order_value.toFixed(2)} para este cupom`
    );
  }

  return {
    id: data.id,
    code: data.code,
    discountType: data.discount_type,
    discountValue: data.discount_value,
    minOrderValue: data.min_order_value,
  };
}

export function calculateCouponDiscount(
  coupon: CouponResult,
  subtotal: number
): number {
  if (coupon.discountType === "percentage") {
    return Math.round(subtotal * (coupon.discountValue / 100) * 100) / 100;
  }
  return Math.min(coupon.discountValue, subtotal);
}
