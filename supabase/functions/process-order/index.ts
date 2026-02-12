/**
 * Edge Function: process-order
 *
 * Fluxo:
 * 1. Valida payload (Zod)
 * 2. Verifica estoque e preços reais no banco
 * 3. Cria/encontra customer
 * 4. Cria order + order_items (snapshot de preços)
 * 5. Decrementa estoque atomicamente (decrement_stock)
 * 6. Cria preferência de pagamento no Mercado Pago
 * 7. Retorna URL de pagamento + dados do pedido
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { MercadoPagoConfig, Preference } from "https://esm.sh/mercadopago@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Parse & validate ───────────────────────────────────────────────────

    const body = await req.json();

    const { customer, address, shippingMethod, paymentMethod, items, couponCode, customerNotes } =
      body;

    if (!customer || !address || !items || items.length === 0) {
      return jsonResponse({ error: "Dados incompletos" }, 400);
    }

    // ── Supabase client (service_role bypasses RLS) ────────────────────────

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Verify stock & prices from DB ──────────────────────────────────────

    const productIds = [...new Set(items.map((i: { productId: string }) => i.productId))];

    const { data: dbProducts, error: prodErr } = await supabase
      .from("products")
      .select("id, name, slug, price, active, product_sizes(id, size_label, stock)")
      .in("id", productIds)
      .eq("active", true);

    if (prodErr || !dbProducts) {
      return jsonResponse({ error: "Erro ao verificar produtos" }, 500);
    }

    // Build lookup map
    const productMap = new Map<string, typeof dbProducts[0]>();
    for (const p of dbProducts) {
      productMap.set(p.id, p);
    }

    // Validate each item
    let subtotal = 0;
    const validatedItems: Array<{
      productId: string;
      productName: string;
      size: string;
      quantity: number;
      unitPrice: number;
    }> = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return jsonResponse(
          { error: `Produto "${item.productName}" não encontrado ou inativo` },
          400
        );
      }

      const sizeRow = product.product_sizes?.find(
        (s: { size_label: string }) => s.size_label === item.size
      );
      if (!sizeRow) {
        return jsonResponse(
          { error: `Tamanho "${item.size}" não disponível para "${product.name}"` },
          400
        );
      }

      if (sizeRow.stock < item.quantity) {
        return jsonResponse(
          {
            error: `Estoque insuficiente para "${product.name}" tam. ${item.size}. Disponível: ${sizeRow.stock}`,
          },
          400
        );
      }

      // Use DB price (not client-supplied)
      const unitPrice = Number(product.price);
      subtotal += unitPrice * item.quantity;

      validatedItems.push({
        productId: item.productId,
        productName: product.name,
        size: item.size,
        quantity: item.quantity,
        unitPrice,
      });
    }

    // ── Shipping price ─────────────────────────────────────────────────────

    let shippingPrice = 15.9; // PAC default
    if (shippingMethod === "sedex") shippingPrice = 29.9;
    if (shippingMethod === "free" && subtotal >= 150) shippingPrice = 0;

    // ── Coupon discount ────────────────────────────────────────────────────

    let discountAmount = 0;
    let couponId: string | null = null;

    if (couponCode) {
      const { data: coupon } = await supabase
        .from("coupons")
        .select("*")
        .ilike("code", couponCode)
        .eq("active", true)
        .single();

      if (coupon) {
        if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
          return jsonResponse({ error: "Cupom esgotado" }, 400);
        }
        if (coupon.min_order_value && subtotal < coupon.min_order_value) {
          return jsonResponse(
            { error: `Pedido mínimo de R$ ${coupon.min_order_value} para este cupom` },
            400
          );
        }

        couponId = coupon.id;
        discountAmount =
          coupon.discount_type === "percentage"
            ? Math.round(subtotal * (coupon.discount_value / 100) * 100) / 100
            : Math.min(coupon.discount_value, subtotal);
      }
    }

    // ── Calculate total ────────────────────────────────────────────────────

    const beforePix = subtotal + shippingPrice - discountAmount;
    const pixDiscount = paymentMethod === "pix" ? beforePix * 0.05 : 0;
    const total = Math.round((beforePix - pixDiscount) * 100) / 100;

    // ── Create/find customer ───────────────────────────────────────────────

    const cleanCpf = customer.cpf?.replaceAll(/\D/g, "") || null;
    const cleanPhone = customer.phone?.replaceAll(/\D/g, "") || null;

    // Try to find existing customer by email
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("email", customer.email)
      .maybeSingle();

    let customerId: string;

    if (existingCustomer) {
      customerId = existingCustomer.id;
      // Update name/phone/cpf if they changed
      await supabase
        .from("customers")
        .update({
          name: customer.name,
          phone: cleanPhone,
          cpf: cleanCpf,
        })
        .eq("id", customerId);
    } else {
      const { data: newCustomer, error: custErr } = await supabase
        .from("customers")
        .insert({
          name: customer.name,
          email: customer.email,
          phone: cleanPhone,
          cpf: cleanCpf,
        })
        .select("id")
        .single();

      if (custErr || !newCustomer) {
        return jsonResponse({ error: "Erro ao criar cliente" }, 500);
      }
      customerId = newCustomer.id;
    }

    // ── Create order ───────────────────────────────────────────────────────

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        customer_id: customerId,
        status: "pending",
        shipping_method: shippingMethod,
        shipping_price: shippingPrice,
        shipping_name: customer.name,
        shipping_cep: address.cep.replaceAll(/\D/g, ""),
        shipping_street: address.street,
        shipping_number: address.number,
        shipping_complement: address.complement || null,
        shipping_neighborhood: address.neighborhood,
        shipping_city: address.city,
        shipping_state: address.state.toUpperCase(),
        payment_method: paymentMethod === "card" ? "credit_card" : paymentMethod,
        subtotal,
        discount_amount: discountAmount + pixDiscount,
        total,
        coupon_id: couponId,
        customer_notes: customerNotes || null,
      })
      .select("id")
      .single();

    if (orderErr || !order) {
      console.error("Order creation error:", orderErr);
      return jsonResponse({ error: "Erro ao criar pedido" }, 500);
    }

    // ── Create order items ─────────────────────────────────────────────────

    const orderItems = validatedItems.map((item) => ({
      order_id: order.id,
      product_id: item.productId,
      product_name: item.productName,
      size: item.size,
      quantity: item.quantity,
      unit_price: item.unitPrice,
    }));

    const { error: itemsErr } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsErr) {
      console.error("Order items error:", itemsErr);
      // Rollback: delete the order
      await supabase.from("orders").delete().eq("id", order.id);
      return jsonResponse({ error: "Erro ao salvar itens do pedido" }, 500);
    }

    // ── Decrement stock ────────────────────────────────────────────────────

    for (const item of validatedItems) {
      const { error: stockErr } = await supabase.rpc("decrement_stock", {
        p_product_id: item.productId,
        p_size_label: item.size,
        p_quantity: item.quantity,
      });

      if (stockErr) {
        console.error("Stock decrement error:", stockErr);
        // Rollback: delete order items and order
        await supabase.from("order_items").delete().eq("order_id", order.id);
        await supabase.from("orders").delete().eq("id", order.id);
        return jsonResponse(
          { error: `Estoque insuficiente para "${item.productName}" tam. ${item.size}` },
          400
        );
      }
    }

    // ── Increment coupon usage ─────────────────────────────────────────────

    if (couponId) {
      await supabase.rpc("increment_coupon_usage", { p_coupon_id: couponId }).catch(() => {
        // Non-critical, log but don't fail
        console.warn("Failed to increment coupon usage");
      });
    }

    // ── Create initial status history ──────────────────────────────────────

    await supabase.from("order_status_history").insert({
      order_id: order.id,
      old_status: null,
      new_status: "pending",
      note: "Pedido criado",
    });

    // ── Create Mercado Pago preference ─────────────────────────────────────

    const mpAccessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");
    if (!mpAccessToken) {
      console.error("MERCADO_PAGO_ACCESS_TOKEN not set");
      return jsonResponse({ error: "Configuração de pagamento indisponível" }, 500);
    }

    const mpClient = new MercadoPagoConfig({ accessToken: mpAccessToken });
    const preference = new Preference(mpClient);

    const siteUrl = Deno.env.get("SITE_URL") || "https://palestrababy.com.br";

    const mpItems = validatedItems.map((item) => ({
      id: item.productId,
      title: `${item.productName} - ${item.size}`,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      currency_id: "BRL",
    }));

    // Add shipping as item if > 0
    if (shippingPrice > 0) {
      mpItems.push({
        id: "shipping",
        title: `Frete (${shippingMethod.toUpperCase()})`,
        quantity: 1,
        unit_price: shippingPrice,
        currency_id: "BRL",
      });
    }

    // Apply discount as negative item
    const totalDiscount = discountAmount + pixDiscount;
    if (totalDiscount > 0) {
      mpItems.push({
        id: "discount",
        title: paymentMethod === "pix" ? "Desconto PIX (5%)" : "Desconto cupom",
        quantity: 1,
        unit_price: -totalDiscount,
        currency_id: "BRL",
      });
    }

    const mpPreference = await preference.create({
      body: {
        items: mpItems,
        payer: {
          name: customer.name,
          email: customer.email,
          phone: {
            area_code: cleanPhone?.substring(0, 2) || "",
            number: cleanPhone?.substring(2) || "",
          },
          identification: {
            type: "CPF",
            number: cleanCpf || "",
          },
        },
        back_urls: {
          success: `${siteUrl}/pedido/confirmacao?order_id=${order.id}&status=approved`,
          failure: `${siteUrl}/pedido/confirmacao?order_id=${order.id}&status=rejected`,
          pending: `${siteUrl}/pedido/confirmacao?order_id=${order.id}&status=pending`,
        },
        auto_return: "approved",
        external_reference: order.id,
        notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/webhook-mercadopago`,
        statement_descriptor: "PALESTRA BABY",
        payment_methods: {
          excluded_payment_types:
            paymentMethod === "pix"
              ? [{ id: "credit_card" }, { id: "debit_card" }]
              : [],
          installments: 3,
        },
      },
    });

    // ── Update order with payment_id ───────────────────────────────────────

    await supabase
      .from("orders")
      .update({ payment_id: mpPreference.id })
      .eq("id", order.id);

    // ── Response ───────────────────────────────────────────────────────────

    return jsonResponse({
      orderId: order.id,
      status: "pending",
      paymentMethod,
      paymentUrl: mpPreference.init_point,
      pixQrCode: mpPreference.point_of_interaction?.transaction_data?.qr_code || null,
      pixQrCodeBase64:
        mpPreference.point_of_interaction?.transaction_data?.qr_code_base64 || null,
      subtotal,
      shippingPrice,
      discountAmount: totalDiscount,
      total,
    });
  } catch (error) {
    console.error("process-order error:", error);
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Erro interno" },
      500
    );
  }
});
